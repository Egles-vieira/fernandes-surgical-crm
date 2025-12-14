-- CRON job para sincronizar templates automaticamente a cada 6 horas
SELECT cron.schedule(
  'sync-whatsapp-templates',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/meta-api-sync-templates',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enpmcHJnbm95d21tandlcHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTMxODksImV4cCI6MjA3NDgyOTE4OX0.GVeAOtDEqJeev7dnDyemdj-W5WXZJdWZo-wUcCXx4wc"}'::jsonb,
    body := '{"cronJob": true}'::jsonb
  ) AS request_id;
  $$
);