import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const assemblyAIApiKey = Deno.env.get('ASSEMBLYAI_API_KEY')!;

async function transcribeVideo(videoUrl: string) {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { 'Authorization': assemblyAIApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: videoUrl, auto_chapters: true, punctuate: true, entity_detection: true }),
  });
  const { id: transcriptId } = await response.json();
  let transcription;
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 5000));
    transcription = await (await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, { headers: { 'Authorization': assemblyAIApiKey } })).json();
    if (transcription.status === 'completed') break;
  }
  return transcription;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { videoUrl } = await req.json();
    const { data: video } = await supabase.from('videos').select('id').eq('video_url', videoUrl).single();
    await supabase.from('videos').update({ status: 'processing' }).eq('id', video.id);

    const transcription = await transcribeVideo(videoUrl);
    const segments = transcription.chapters || [];

    const formattedSegments = segments.map((s: any) => ({
      video_id: video.id,
      start_time: s.start / 1000,
      end_time: s.end / 1000,
      transcript: s.text || '',
      summary: `${s.headline || 'Segment'} ||| ${s.summary || ''}`
    }));

    await supabase.from('segments').delete().eq('video_id', video.id);
    await supabase.from('segments').insert(formattedSegments);
    await supabase.from('videos').update({ status: 'completed' }).eq('id', video.id);

    return new Response(JSON.stringify({ success: true, videoId: video.id, segmentsCount: formattedSegments.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
