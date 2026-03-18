import { Request, Response, RequestHandler } from "express";
import AppDataSource from "../infrastructure/database";
import { Invoice } from "../entity/invoice";
import axios from "axios";
import FormData from "form-data";

interface OCRResponse {
    doc: {
        source_id: string | null;
        currency: string;
        payment_method: string;
        notes: string | null;
    };
    vendor: {
        name: string;
        address: string | null;
        geo_hint: string | null;
    };
    datetime: {
        date: string;
        time: string | null;
    };
    items: any[];
    totals: {
        subtotal: number | null;
        discount: number | null;
        tax: number | null;
        grand_total: number;
    };
}

class OCRController {
    /**
     * Process OCR from image
     * POST /api/ocr
     * Body: multipart/form-data with file field
     */
    public processOCR: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!req.file) {
            res.status(400).json({ message: "File is required" });
            return;
        }

        try {
            // Create FormData for API request
            const formData = new FormData();
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            // Call OCR API
            const response = await axios.post<OCRResponse>(
                'https://ai-greenmind.khoav4.com/ocr_text',
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    }
                }
            );

            const ocrResult = response.data;

            // Save invoice to database
            const invoiceRepository = AppDataSource.getRepository(Invoice);
            const invoice = invoiceRepository.create({
                userId,
                source_id: ocrResult.doc.source_id || undefined,
                currency: ocrResult.doc.currency,
                payment_method: ocrResult.doc.payment_method || undefined,
                notes: ocrResult.doc.notes || undefined,
                vendor_name: ocrResult.vendor.name,
                vendor_address: ocrResult.vendor.address || undefined,
                vendor_geo_hint: ocrResult.vendor.geo_hint || undefined,
                invoice_date: ocrResult.datetime.date,
                invoice_time: ocrResult.datetime.time || undefined,
                items: ocrResult.items,
                subtotal: ocrResult.totals.subtotal || undefined,
                discount: ocrResult.totals.discount || 0,
                tax: ocrResult.totals.tax || 0,
                grand_total: ocrResult.totals.grand_total
            });

            await invoiceRepository.save(invoice);

            // Return the same format as API response
            res.status(200).json(ocrResult);
        } catch (error) {

            if (axios.isAxiosError(error)) {
                res.status(error.response?.status || 500).json({
                    message: "OCR processing failed",
                    error: error.response?.data || error.message
                });
            } else {
                res.status(500).json({ message: "Internal server error" });
            }
        }
    };

    /**
     * Get all invoices for the authenticated user
     * GET /api/invoices
     */
    public getInvoices: RequestHandler = async (req: Request, res: Response) => {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        try {
            const invoiceRepository = AppDataSource.getRepository(Invoice);
            const invoices = await invoiceRepository.find({
                where: { userId },
                order: { createdAt: 'DESC' }
            });


            // Transform invoices to match the OCR response format
            const formattedInvoices = invoices.map(invoice => ({
                id: invoice.id,
                doc: {
                    source_id: invoice.source_id,
                    currency: invoice.currency,
                    payment_method: invoice.payment_method,
                    notes: invoice.notes
                },
                vendor: {
                    name: invoice.vendor_name,
                    address: invoice.vendor_address,
                    geo_hint: invoice.vendor_geo_hint
                },
                datetime: {
                    date: invoice.invoice_date,
                    time: invoice.invoice_time
                },
                items: invoice.items,
                totals: {
                    subtotal: invoice.subtotal,
                    discount: invoice.discount,
                    tax: invoice.tax,
                    grand_total: invoice.grand_total
                },
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt
            }));

            res.status(200).json(formattedInvoices);
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    };
}

export default new OCRController();