# OhAPI generation defaults — the verified recipe

Snapshot of `oh-test/DEFAULTS.md` from the 16 August 2026 live test session
(partner key, characters Juliana 21706 / Isabella 21667 / Sienna 21555 /
Alma 21751). The provider's published documentation does not describe most
of this; see `OHAPI_REFERENCE.md` for the endpoint shapes these settings ride
on, and `docs/ohapi-terms-2026-08-16.json` for the validated attribute
catalogs. Feeds the user-facing character creator when that is built.

---

# OhAPI — rekommenderade default-inställningar (Juliana-testet, 2026-08-16)

## Bild — default
```json
{
  "character_id": "21706",
  "prompt_enhancement": false,
  "resolution": [1080, 1920],
  "user_gender": "male"
}
```
- `prompt_enhancement: false` — egen prompt vann över AI-enhancement i rankingen (snabbare också: ~33s vs ~48-52s)
- `[1080, 1920]` — äkta 2,25× upplösning vs preset (presets låser på 720×1280)
- Preset `"9:16"` endast när hastighet > kvalitet

## Prompt-mall (struktur som vann)
```
[kamerasätt] + [handling/pose] + [outfit] + [plats] + [ljus/stil]
```
Exempel:
- `casual selfie at golden hour on the beach, wearing a white linen shirt, warm sunset light` ← vinnare runda 1
- `fine art nude photography, standing pose, sculptural studio lighting, elegant and tasteful` ← bästa liken (5_nude)
- `boudoir photo, wearing black lace lingerie, silk bedsheets, soft warm candlelight`

Regler:
1. Beskriv ALDRIG hennes utseende i prompten — CID:t äger identiteten
2. Prompten äger: scen, outfit, pose, ljus, vinkel
3. Kör 2–3 identiska jobb parallellt, visa sida-vid-sida, spara vinnaren ("take the best")

## Chat — default
```json
POST /api/v1/rooms    { "character_id": "21706", "user_id": "<er användares ID>" }
POST /api/v1/text     { "room_id": "<sparad per användare+karaktär>", "character_id": "21706", "message": "..." }
```
- user_id är OBLIGATORISK (ej i den officiella dokumentationen)
- Svaret ligger i fältet `content`
- Återanvänd rummet — det är konversationsminnet. Nytt rum = ren kontext.

## Video / Audio
- Video: `POST /api/v1/videos/create` med `character_id + prompt` (text-till-video)
  eller `image_url + prompt` (image-to-video — genererade bilder kan seeda video)
- Audio: `POST /api/v1/audio` med `character_id + text`
- Båda async: polla `GET /api/v1/jobs/{job_id}/status` var 2–5s, max 5 min

## Alltid
- Ladda ner presigned-URL:er DIREKT (upphör snabbt) — spara i egen S3 + metadata
- 400 = moderation, 403 = krediter/behörighet, 429 = rate limit, 5xx = retry med backoff
- NSFW-behörighet: bekräftad PÅ för partnernyckeln (gradient 1–5 passerade, 0 st 400)
