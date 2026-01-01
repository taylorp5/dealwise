-- Negotiation Co-Pilot Database Schema
-- Run this in your Supabase SQL Editor

-- Create negotiation_sessions table
CREATE TABLE IF NOT EXISTS public.negotiation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pack_type TEXT NOT NULL CHECK (pack_type IN ('first_time', 'cash', 'financing', 'in_person')),
    
    -- Car info
    car_make TEXT,
    car_model TEXT,
    car_year INTEGER,
    car_vin TEXT,
    listing_url TEXT,
    asking_price DECIMAL(10, 2),
    
    -- User preferences from wizard
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'finance', 'lease')),
    max_otd_budget DECIMAL(10, 2),
    timeline TEXT CHECK (timeline IN ('asap', 'this_week', 'this_month', 'flexible')),
    has_trade_in BOOLEAN DEFAULT false,
    trade_in_details JSONB,
    communication_method TEXT NOT NULL CHECK (communication_method IN ('email', 'text', 'in_person', 'phone')),
    tone_preference TEXT CHECK (tone_preference IN ('professional', 'friendly', 'firm', 'casual')),
    risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    must_have_features TEXT[],
    
    -- Financing-specific (if applicable)
    max_monthly_payment DECIMAL(10, 2),
    down_payment DECIMAL(10, 2),
    pre_approved BOOLEAN DEFAULT false,
    pre_approval_rate DECIMAL(5, 2),
    
    -- Generated strategy
    initial_strategy JSONB,
    initial_script TEXT,
    in_person_talk_track TEXT,
    
    -- Session state
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    current_stage TEXT CHECK (current_stage IN ('initial_contact', 'negotiating', 'finalizing', 'closed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create session_messages table
CREATE TABLE IF NOT EXISTS public.session_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.negotiation_sessions(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL CHECK (role IN ('user', 'dealer', 'copilot')),
    content TEXT NOT NULL,
    
    -- Copilot-specific fields
    tactic_explanation TEXT,
    recommended_response TEXT,
    suggested_counter_range JSONB, -- {min: number, max: number, rationale: string}
    next_questions TEXT[],
    checklist_items TEXT[],
    
    -- Metadata
    message_type TEXT CHECK (message_type IN ('initial', 'response', 'follow_up', 'strategy_update')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for negotiation_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.negotiation_sessions;
CREATE POLICY "Users can view own sessions"
    ON public.negotiation_sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.negotiation_sessions;
CREATE POLICY "Users can insert own sessions"
    ON public.negotiation_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.negotiation_sessions;
CREATE POLICY "Users can update own sessions"
    ON public.negotiation_sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.negotiation_sessions;
CREATE POLICY "Users can delete own sessions"
    ON public.negotiation_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for session_messages
DROP POLICY IF EXISTS "Users can view own session messages" ON public.session_messages;
CREATE POLICY "Users can view own session messages"
    ON public.session_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions
            WHERE negotiation_sessions.id = session_messages.session_id
            AND negotiation_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own session messages" ON public.session_messages;
CREATE POLICY "Users can insert own session messages"
    ON public.session_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions
            WHERE negotiation_sessions.id = session_messages.session_id
            AND negotiation_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own session messages" ON public.session_messages;
CREATE POLICY "Users can update own session messages"
    ON public.session_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions
            WHERE negotiation_sessions.id = session_messages.session_id
            AND negotiation_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own session messages" ON public.session_messages;
CREATE POLICY "Users can delete own session messages"
    ON public.session_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiation_sessions
            WHERE negotiation_sessions.id = session_messages.session_id
            AND negotiation_sessions.user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.negotiation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.negotiation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.negotiation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.session_messages(created_at ASC);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.negotiation_sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.negotiation_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();






