-- Normalise existing player names to title case.
--
-- Registrants entered names in mixed casing — ALL CAPS ("KANHAIYA PRASAD"),
-- all-lower ("ayush jagga"), etc. Going forward the registration action
-- title-cases full_name on submit (lib/registration.ts toTitleCase); this
-- backfills the rows already in the table so every surface that reads
-- players.full_name — admin review list, auction console, big screen, and the
-- public franchises owners — shows consistent title case.
--
-- Postgres initcap() capitalises the first alphanumeric of each word and
-- lowercases the rest, treating spaces/punctuation as word boundaries, so
-- "DIPAK KUMAR SINGH" -> "Dipak Kumar Singh" and "harbir basi (sherry)" ->
-- "Harbir Basi (Sherry)". The WHERE clause skips already-correct rows (and
-- satisfies the safe-update guard).

update public.players
set full_name = initcap(full_name)
where full_name is not null
  and full_name <> initcap(full_name);
