#Prism

Like how a real prism can split white light into a rainbow, making all the colors easily visible,
the study app Prism splits videos into segments, each of which are summarized for easier and more
efficient studying.

The program validates video type and size before transferring the video to Supabase storage,
where a URL is generated. The URL is sent to AssemblyAI for transcription and segmentation.

This is sent back to the program, which converts the AI's response into segments with titles,
summaries, and timestamps, which are all stored in Supabase and shown back to the user.

The program also deletes videos older than ten minutes as well as any corresponding files since
I don't have enough storage to hold more than five videos at once. However, the user will still see
their summaries until they reload/close out of the page.

I will continue working to improve segmentation, summarization, and the titles of each segment.

I hope to add a model that becomes an expert on the video so the user can ask questions and learn deeper.

I will also improve the UI and add support for bulk uploads.
