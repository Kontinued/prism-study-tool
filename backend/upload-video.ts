import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { fileName, fileSize, fileType } = await req.json();
    if (!fileName || !fileSize || !fileType) throw new Error('Missing required fields');

    if (fileSize > 100 * 1024 * 1024) throw new Error('File too large');
    if (!fileType.startsWith('video/')) throw new Error('Invalid file type');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `video-${Date.now()}.${fileExt}`;

    const { data: signedUrlData, error } = await supabase.storage.from('videos').createSignedUploadUrl(uniqueFileName, { upsert: true });
    if (error) throw error;

    const finalUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/videos/${uniqueFileName}`;
    return new Response(JSON.stringify({ success: true, uploadUrl: signedUrlData.signedUrl, finalUrl, path: uniqueFileName }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
