import { Router } from 'express';
import { jwtAuthMiddleware, jwtOptionalMiddleware } from '../middlewares/jwtMiddleware';
import blogController from '../controller/blogController';

const router = Router();

// ⚠️  /user/my-blogs và /:id/likes phải đứng TRƯỚC /:id để tránh Express
//     hiểu nhầm "user" hay "likes" là một UUID.

// Public
router.get('/', blogController.listBlogs);
router.get('/user/my-blogs', jwtAuthMiddleware, blogController.getMyBlogs);
router.get('/:id/likes', blogController.getBlogLikes);
router.get('/:id', jwtOptionalMiddleware, blogController.getBlogById); // auth optional

// Protected
router.post('/', jwtAuthMiddleware, blogController.createBlog);
router.put('/:id', jwtAuthMiddleware, blogController.updateBlog);
router.delete('/:id', jwtAuthMiddleware, blogController.deleteBlog);
router.post('/:id/like', jwtAuthMiddleware, blogController.toggleLike);
router.post('/:id/comments', jwtAuthMiddleware, blogController.addComment);
router.put('/:id/comments/:commentId', jwtAuthMiddleware, blogController.updateComment);
router.delete('/:id/comments/:commentId', jwtAuthMiddleware, blogController.deleteComment);

export default router;

