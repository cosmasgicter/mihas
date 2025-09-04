import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 })
  }

  try {
    // Get request body
    const { applicationId, documentType, fileName, fileData, fileSize, mimeType } = await req.json()

    // Validate required fields
    if (!applicationId || !documentType || !fileName || !fileData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Convert base64 to blob
    const base64Data = fileData.split(',')[1] // Remove data:mime/type;base64, prefix
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    
    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const uniqueFileName = `${applicationId}/${documentType}/${timestamp}-${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(uniqueFileName, binaryData, {
        contentType: mimeType,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(uniqueFileName)

    // Save document record to database
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        file_name: fileName,
        file_path: uniqueFileName,
        file_url: urlData.publicUrl,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (docError) {
      console.error('Database error:', docError)
      return new Response(
        JSON.stringify({ error: 'Failed to save document record', details: docError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: docData,
        url: urlData.publicUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
