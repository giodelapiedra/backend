-- Updated incidents table with reason field
-- This allows team leaders to specify the reason when submitting incidents

CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NULL,
  reported_by uuid NULL,
  incident_type character varying(50) NULL,
  description text NULL,
  severity character varying(20) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  worker_id uuid NULL,
  reason character varying(50) NULL,
  CONSTRAINT incidents_pkey PRIMARY KEY (id),
  CONSTRAINT incidents_case_id_fkey FOREIGN KEY (case_id) REFERENCES cases (id),
  CONSTRAINT incidents_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES users (id),
  CONSTRAINT incidents_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES users (id),
  CONSTRAINT incidents_reason_check CHECK (
    reason IS NULL OR reason IN (
      'sick',
      'on_leave_rdo', 
      'transferred',
      'injured_medical',
      'not_rostered'
    )
  )
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id 
ON public.incidents USING btree (worker_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_incidents_reason 
ON public.incidents USING btree (reason) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_incidents_reported_by 
ON public.incidents USING btree (reported_by) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_incidents_case_id 
ON public.incidents USING btree (case_id) 
TABLESPACE pg_default;

-- Add comments for documentation
COMMENT ON COLUMN public.incidents.reason IS 'Reason for the incident when worker is unavailable (sick, on_leave_rdo, transferred, injured_medical, not_rostered)';
COMMENT ON COLUMN public.incidents.incident_type IS 'Type of incident (e.g., worker_unavailable, safety_concern, etc.)';
COMMENT ON COLUMN public.incidents.severity IS 'Severity level (low, medium, high, critical)';
