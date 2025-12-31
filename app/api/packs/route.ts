import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const userId = session?.user?.id || null

    // Fetch all active packs
    const { data: allPacks, error: packsError } = await supabase
      .from('packs')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (packsError) {
      throw packsError
    }

    let userPacks: any[] = []
    let selectedPackId: string | null = null

    if (userId) {
      const { data: upacks } = await supabase
        .from('user_packs')
        .select('pack_id, is_unlocked, unlocked_at')
        .eq('user_id', userId)

      userPacks = upacks || []

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('selected_pack_id')
        .eq('user_id', userId)
        .single()

      selectedPackId = profile?.selected_pack_id || null
    }

    return NextResponse.json({
      success: true,
      packs: allPacks || [],
      userPacks,
      selectedPackId,
    })
  } catch (error: any) {
    console.error('Error fetching packs:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch packs' },
      { status: 500 }
    )
  }
}

