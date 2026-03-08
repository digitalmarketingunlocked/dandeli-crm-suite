ALTER TABLE contacts DROP CONSTRAINT contacts_source_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_source_check CHECK (source = ANY (ARRAY['website','referral','social','walk-in','phone','email','other','organic','google-ads','meta-ads','offline-marketing']));

ALTER TABLE contacts DROP CONSTRAINT contacts_type_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_type_check CHECK (type = ANY (ARRAY['lead','customer','partner','interested','follow-up','negotiation','booked','lost']));