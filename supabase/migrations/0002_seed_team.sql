-- Three reps that together cover the languages the landing form accepts.
-- Sofia: English/Spanish (available).
-- Daniel: English/Korean (on-call) — routing should deprioritize him when busy.
-- Priya: English (available, lighter load) — catch-all for English leads.

insert into team_members (id, name, initials, role, email, languages, active_leads, status) values
  ('tm_sofia',  'Sofia Ramirez',   'SR', 'Senior Loan Specialist', 'sofia.ramirez@northline.co',  array['English','Spanish']::language[], 7,  'available'),
  ('tm_daniel', 'Daniel Cho',      'DC', 'Loan Specialist',        'daniel.cho@northline.co',     array['English','Korean']::language[],  12, 'on-call'),
  ('tm_priya',  'Priya Natarajan', 'PN', 'Loan Specialist',        'priya.natarajan@northline.co',array['English']::language[],           9,  'available');
