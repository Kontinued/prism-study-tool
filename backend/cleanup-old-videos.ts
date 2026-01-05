import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { del } from 'https://esm.sh/@vercel/blob@0.23.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: oldVideos, error: fetchError } = await supabase
      .from('videos')
      .select('id, video_url, created_at')
      .lt('created_at', tenMinutesAgo);

    if (fetchError) throw fetchError;
    if (!oldVideos?.length) return new Response(JSON.stringify({ success: true, deletedCount: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const vercelToken = Deno.env.get('VERCEL_BLOB_READ_WRITE_TOKEN');
    let deletedFiles = 0, deletedVideos = 0;

    for (const video of oldVideos) {
      if (vercelToken && video.video_url) await del(video.video_url, { token: vercelToken }).then(() => deletedFiles++);
      await supabase.from('segments').delete().eq('video_id', video.id);
      const { error: videoError } = await supabase.from('videos').delete().eq('id', video.id);
      if (!videoError) deletedVideos++;
    }

    return new Response(JSON.stringify({ success: true, deletedVideos, deletedFiles, totalProcessed: oldVideos.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
