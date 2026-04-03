-- Enable Realtime replication for tables used in live UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE document_extractions;
ALTER PUBLICATION supabase_realtime ADD TABLE extracted_fields;
ALTER PUBLICATION supabase_realtime ADD TABLE case_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tariff_classifications;
ALTER PUBLICATION supabase_realtime ADD TABLE validation_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE case_conflicts;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_events;
ALTER PUBLICATION supabase_realtime ADD TABLE operation_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE case_documents;
