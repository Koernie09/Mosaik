# MOSAIK development rules

MOSAIK turns incomplete source material into verified, reusable school data.

For milestone 1, keep the product slice deliberately narrow:

1. accept one image or PDF of one teacher's weekly timetable;
2. extract a draft;
3. let the user review every lesson and uncertainty;
4. confirm the schedule;
5. hand the confirmed schedule to ATLAS.

The domain contract in `src/domain/personal-schedule` is authoritative. UI code may
not invent a second schedule shape. Do not add work-time categories or other ATLAS
business rules to MOSAIK. MOSAIK verifies timetable facts; ATLAS decides how those
facts become planned or recorded work.

Do not persist source files by default. Any future server-side extraction must
document retention, deletion, hosting region and data-processing boundaries before
it is enabled.
