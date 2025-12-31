import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Support Authorization header (Bearer token) and cookie session
    const authHeader = request.headers.get('authorization')
    let supabase = await createServerClient()
    let userId: string | null = null

    // If Bearer token is provided, create a client with that token for RLS
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      // First verify the token and get user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
      }
      
      userId = user.id
      
      // For server-side operations, use service role key to bypass RLS
      // This is necessary because RLS policies check auth.uid() which may not
      // work properly with Bearer tokens in server-side API routes
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (serviceRoleKey) {
        // Use service role key - bypasses RLS (secure because we've already verified the user)
        supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      } else {
        // Fallback: use anon key with token in headers (may not work with RLS)
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            persistSession: false,
          },
        })
        console.warn('SUPABASE_SERVICE_ROLE_KEY not set - RLS may block this operation. Set it in .env.local for server-side operations.')
      }
    } else {
      // Use cookie-based session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { packId } = await request.json()
    if (!packId) {
      return NextResponse.json({ success: false, error: 'Missing packId' }, { status: 400 })
    }

    // Ensure pack exists
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('id')
      .eq('id', packId)
      .single()

    if (packError || !pack) {
      return NextResponse.json({ success: false, error: 'Pack not found' }, { status: 404 })
    }

    // Check if user_pack record already exists
    const { data: existingPack, error: checkError } = await supabase
      .from('user_packs')
      .select('id')
      .eq('user_id', userId)
      .eq('pack_id', packId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError
    }

    // Update existing record or insert new one
    if (existingPack) {
      const { error: updateError } = await supabase
        .from('user_packs')
        .update({
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('pack_id', packId)

      if (updateError) {
        throw updateError
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_packs')
        .insert({
          user_id: userId,
          pack_id: packId,
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        })

      if (insertError) {
        throw insertError
      }
    }

    return NextResponse.json({ success: true, packId })
  } catch (error: any) {
    console.error('Error unlocking pack:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unlock pack' },
      { status: 500 }
    )
  }
}

