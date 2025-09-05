import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'CAPTCHA token is required' }, { status: 400 })
    }

    // Verify Turnstile token with Cloudflare
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY || '',
        response: token,
      }),
    })

    const turnstileResult = await turnstileResponse.json()

    if (!turnstileResult.success) {
      console.error('Turnstile verification failed:', turnstileResult)
      return NextResponse.json(
        { error: 'CAPTCHA verification failed', details: turnstileResult['error-codes'] }, 
        { status: 400 }
      )
    }

    // If we have a Supabase Edge Function for additional verification, call it
    // Otherwise, return success
    try {
      const supabaseResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ token, verified: true }),
      })

      if (supabaseResponse.ok) {
        const result = await supabaseResponse.json()
        return NextResponse.json(result)
      }
    } catch (error) {
      console.warn('Supabase Edge Function call failed, using direct Turnstile verification:', error)
    }

    // Return success based on Turnstile verification
    return NextResponse.json({ 
      success: true, 
      message: 'CAPTCHA verified successfully',
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('CAPTCHA verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}