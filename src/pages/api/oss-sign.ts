import type { APIRoute } from 'astro';
import OSS from 'ali-oss';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { fileName, contentType } = body ?? {};

        if (!fileName) {
            return new Response(JSON.stringify({ error: 'fileName is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (contentType && !allowedTypes.includes(contentType)) {
            return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const client = new OSS({
            region: import.meta.env.OSS_REGION,
            accessKeyId: import.meta.env.OSS_ACCESS_KEY_ID,
            accessKeySecret: import.meta.env.OSS_ACCESS_KEY_SECRET,
            bucket: import.meta.env.OSS_BUCKET,
        });

        const safeFileName = String(fileName).replace(/[^\w.\-]/g, '_');
        const objectKey = `uploads/${Date.now()}-${safeFileName}`;

        const uploadUrl = client.signatureUrl(objectKey, {
            method: 'PUT',
            expires: 60,
            'Content-Type': contentType || 'application/octet-stream',
        });

        const publicUrl = `https://${import.meta.env.OSS_PUBLIC_HOST}/${objectKey}`;

        return new Response(
            JSON.stringify({
                uploadUrl,
                objectKey,
                publicUrl,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('oss-sign error:', error);

        return new Response(
            JSON.stringify({ error: 'Failed to generate upload URL' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
};