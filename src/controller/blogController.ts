import { Request, Response, RequestHandler } from 'express';
import AppDataSource from '../infrastructure/database';
import { Blog, BlogLike, BlogComment } from '../entity/blog';
import { User } from '../entity/user';

function getBlogRepo() {
    return AppDataSource.getRepository(Blog);
}

function getLikeRepo() {
    return AppDataSource.getRepository(BlogLike);
}

function getCommentRepo() {
    return AppDataSource.getRepository(BlogComment);
}

class BlogController {

    // GET /blogs
    public listBlogs: RequestHandler = async (req: Request, res: Response) => {
        try {
            const { page = '1', limit = '10', search } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

            const qb = getBlogRepo()
                .createQueryBuilder('blog')
                .leftJoin('blog.author', 'author')
                .select([
                    'blog.id',
                    'blog.title',
                    'blog.content',
                    'blog.tags',
                    'blog.like_count',
                    'blog.author_id',
                    'blog.createdAt',
                    'blog.updatedAt',
                    'author.id',
                    'author.username',
                    'author.fullName',
                ])
                .orderBy('blog.createdAt', 'DESC')
                .skip((pageNum - 1) * limitNum)
                .take(limitNum);

            if (search) {
                qb.where(
                    'blog.title ILIKE :search OR blog.content ILIKE :search',
                    { search: `%${search}%` }
                );
            }

            const [data, total] = await qb.getManyAndCount();

            res.status(200).json({
                message: 'Blogs retrieved successfully',
                data: data.map((b) => ({
                    id: b.id,
                    title: b.title,
                    content: b.content,
                    tags: b.tags ?? [],
                    like_count: b.like_count,
                    author_id: b.author_id,
                    author: b.author
                        ? { id: b.author.id, username: b.author.username, fullName: b.author.fullName }
                        : null,
                    createdAt: b.createdAt,
                    updatedAt: b.updatedAt,
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        } catch (error) {
            console.error('[listBlogs]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // GET /blogs/user/my-blogs
    public getMyBlogs: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const { page = '1', limit = '10' } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 10, 100));

            const [data, total] = await getBlogRepo().findAndCount({
                where: { author_id: userId },
                order: { createdAt: 'DESC' },
                select: ['id', 'title', 'tags', 'like_count', 'author_id', 'createdAt', 'updatedAt'],
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            });

            res.status(200).json({
                message: 'My blogs retrieved successfully',
                data,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        } catch (error) {
            console.error('[getMyBlogs]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // GET /blogs/:id
    public getBlogById: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId; // optional auth

            const blog = await getBlogRepo().findOne({
                where: { id: req.params.id },
                relations: ['author', 'comments', 'comments.user'],
            });

            if (!blog) { res.status(404).json({ message: 'Blog not found' }); return; }

            let isLiked: boolean | undefined;
            if (userId) {
                const existing = await getLikeRepo().findOneBy({ userId, blogId: blog.id });
                isLiked = !!existing;
            }

            // Sort comments oldest-first
            const comments = (blog.comments ?? []).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            res.status(200).json({
                message: 'Blog retrieved successfully',
                data: {
                    id: blog.id,
                    title: blog.title,
                    content: blog.content,
                    tags: blog.tags ?? [],
                    like_count: blog.like_count,
                    comment_count: blog.comment_count,
                    author_id: blog.author_id,
                    author: blog.author
                        ? { id: blog.author.id, username: blog.author.username, fullName: blog.author.fullName }
                        : null,
                    ...(userId !== undefined ? { isLiked } : {}),
                    comments: comments.map((c) => ({
                        id: c.id,
                        content: c.content,
                        createdAt: c.createdAt,
                        updatedAt: c.updatedAt,
                        user: c.user
                            ? { id: c.user.id, username: c.user.username, fullName: c.user.fullName }
                            : null,
                    })),
                    createdAt: blog.createdAt,
                    updatedAt: blog.updatedAt,
                },
            });
        } catch (error) {
            console.error('[getBlogById]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // POST /blogs
    public createBlog: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const { title, content, tags } = req.body;

            if (!title || typeof title !== 'string' || title.trim() === '' ||
                !content || typeof content !== 'string' || content.trim() === '') {
                res.status(400).json({ message: 'Title and content are required' });
                return;
            }
            if (title.length > 500) {
                res.status(400).json({ message: 'Title must not exceed 500 characters' });
                return;
            }

            const blogRepo = getBlogRepo();
            const saved = await blogRepo.save(
                blogRepo.create({
                    title: title.trim(),
                    content: content.trim(),
                    tags: Array.isArray(tags) ? tags : undefined,
                    like_count: 0,
                    author_id: userId,
                })
            );

            res.status(201).json({ message: 'Blog created successfully', data: saved });
        } catch (error) {
            console.error('[createBlog]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // PUT /blogs/:id
    public updateBlog: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const blogRepo = getBlogRepo();
            const blog = await blogRepo.findOneBy({ id: req.params.id });

            if (!blog || blog.author_id !== userId) {
                res.status(404).json({ message: 'Blog not found or you are not the author' });
                return;
            }

            const { title, content, tags } = req.body;
            if (title !== undefined) blog.title = title.trim();
            if (content !== undefined) blog.content = content.trim();
            if (tags !== undefined) blog.tags = Array.isArray(tags) ? tags : undefined;

            const updated = await blogRepo.save(blog);
            res.status(200).json({ message: 'Blog updated successfully', data: updated });
        } catch (error) {
            console.error('[updateBlog]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // DELETE /blogs/:id
    public deleteBlog: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const blogRepo = getBlogRepo();
            const blog = await blogRepo.findOneBy({ id: req.params.id });

            if (!blog || blog.author_id !== userId) {
                res.status(404).json({ message: 'Blog not found or you are not the author' });
                return;
            }

            await blogRepo.remove(blog);
            res.status(200).json({ message: 'Blog deleted successfully' });
        } catch (error) {
            console.error('[deleteBlog]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // POST /blogs/:id/like  (toggle)
    public toggleLike: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const blogRepo = getBlogRepo();
            const blog = await blogRepo.findOneBy({ id: req.params.id });
            if (!blog) { res.status(404).json({ message: 'Blog not found' }); return; }

            const likeRepo = getLikeRepo();
            const existing = await likeRepo.findOneBy({ userId, blogId: blog.id });

            if (existing) {
                await likeRepo.remove(existing);
                blog.like_count = Math.max(0, blog.like_count - 1);
                await blogRepo.save(blog);
                res.status(200).json({ message: 'Blog unliked successfully', liked: false, like_count: blog.like_count });
            } else {
                await likeRepo.save(likeRepo.create({ userId, blogId: blog.id }));
                blog.like_count += 1;
                await blogRepo.save(blog);
                res.status(200).json({ message: 'Blog liked successfully', liked: true, like_count: blog.like_count });
            }
        } catch (error) {
            console.error('[toggleLike]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // GET /blogs/:id/likes
    public getBlogLikes: RequestHandler = async (req: Request, res: Response) => {
        try {
            const { page = '1', limit = '20' } = req.query as Record<string, string>;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, Math.min(parseInt(limit) || 20, 100));

            const blog = await getBlogRepo().findOneBy({ id: req.params.id });
            if (!blog) { res.status(404).json({ message: 'Blog not found' }); return; }

            const [likes, total] = await getLikeRepo().findAndCount({
                where: { blogId: req.params.id },
                relations: ['user'],
                order: { createdAt: 'DESC' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            });

            res.status(200).json({
                message: 'Blog likes retrieved successfully',
                data: likes.map((l) => ({
                    id: l.id,
                    createdAt: l.createdAt,
                    user: l.user ? { id: l.user.id, username: l.user.username, fullName: l.user.fullName } : null,
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        } catch (error) {
            console.error('[getBlogLikes]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // POST /blogs/:id/comments
    public addComment: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const blogRepo = getBlogRepo();
            const blog = await blogRepo.findOneBy({ id: req.params.id });
            if (!blog) { res.status(404).json({ message: 'Blog not found' }); return; }

            const { content } = req.body;
            if (!content || typeof content !== 'string' || content.trim() === '') {
                res.status(400).json({ message: 'Comment content is required' });
                return;
            }

            const commentRepo = getCommentRepo();
            const comment = await commentRepo.save(
                commentRepo.create({
                    content: content.trim(),
                    userId,
                    blogId: blog.id,
                })
            );

            // increment comment_count
            blog.comment_count += 1;
            await blogRepo.save(blog);

            // load user info
            const saved = await commentRepo.findOne({
                where: { id: comment.id },
                relations: ['user'],
            });

            res.status(201).json({
                message: 'Comment added successfully',
                data: {
                    id: saved!.id,
                    content: saved!.content,
                    createdAt: saved!.createdAt,
                    user: saved!.user
                        ? { id: saved!.user.id, username: saved!.user.username, fullName: saved!.user.fullName }
                        : null,
                },
            });
        } catch (error) {
            console.error('[addComment]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // PUT /blogs/:id/comments/:commentId
    public updateComment: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const commentRepo = getCommentRepo();
            const comment = await commentRepo.findOne({
                where: { id: req.params.commentId, blogId: req.params.id },
                relations: ['user'],
            });

            if (!comment) { res.status(404).json({ message: 'Comment not found' }); return; }
            if (comment.userId !== userId) { res.status(403).json({ message: 'You can only edit your own comments' }); return; }

            const { content } = req.body;
            if (!content || typeof content !== 'string' || content.trim() === '') {
                res.status(400).json({ message: 'Comment content is required' });
                return;
            }

            comment.content = content.trim();
            const updated = await commentRepo.save(comment);

            res.status(200).json({
                message: 'Comment updated successfully',
                data: {
                    id: updated.id,
                    content: updated.content,
                    createdAt: updated.createdAt,
                    updatedAt: updated.updatedAt,
                    user: updated.user
                        ? { id: updated.user.id, username: updated.user.username, fullName: updated.user.fullName }
                        : null,
                },
            });
        } catch (error) {
            console.error('[updateComment]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };

    // DELETE /blogs/:id/comments/:commentId
    public deleteComment: RequestHandler = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

            const commentRepo = getCommentRepo();
            const comment = await commentRepo.findOneBy({ id: req.params.commentId, blogId: req.params.id });

            if (!comment) { res.status(404).json({ message: 'Comment not found' }); return; }
            if (comment.userId !== userId) { res.status(403).json({ message: 'You can only delete your own comments' }); return; }

            await commentRepo.remove(comment);

            // decrement comment_count
            const blogRepo = getBlogRepo();
            const blog = await blogRepo.findOneBy({ id: req.params.id });
            if (blog) {
                blog.comment_count = Math.max(0, blog.comment_count - 1);
                await blogRepo.save(blog);
            }

            res.status(200).json({ message: 'Comment deleted successfully' });
        } catch (error) {
            console.error('[deleteComment]', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
}

export default new BlogController();
