-- The indexes from V1, as standalone statements.
--
-- The live database is baselined at V1 rather than having it run, so these need applying
-- once by hand. IF NOT EXISTS keeps it safe to re-run.

CREATE INDEX idx_appt_hospital ON appointment (`hospital_id`);
CREATE INDEX idx_appt_hospital_performer ON appointment (`hospital_id`,`performer_id`);
CREATE INDEX idx_appt_hospital_patient ON appointment (`hospital_id`,`patient_id`);
CREATE INDEX idx_fu_hospital ON follow_up (`hospital_id`);
CREATE INDEX idx_fu_hospital_doctor ON follow_up (`hospital_id`,`doctor_id`);
CREATE INDEX idx_fu_hospital_status ON follow_up (`hospital_id`,`status`);
CREATE INDEX idx_mr_hospital ON medical_record (`hospital_id`);
CREATE INDEX idx_mr_hospital_patient ON medical_record (`hospital_id`,`patient_id`);
CREATE INDEX idx_mr_hospital_type ON medical_record (`hospital_id`,`record_type`);
CREATE INDEX idx_patient_hospital ON patient (`hospital_id`);
CREATE INDEX idx_patient_hospital_phone ON patient (`hospital_id`,`phone_number`);
CREATE INDEX idx_rx_hospital ON prescription (`hospital_id`);
CREATE INDEX idx_rx_hospital_doctor ON prescription (`hospital_id`,`doctor_id`);
CREATE INDEX idx_rx_hospital_patient ON prescription (`hospital_id`,`patient_id`);
