# OhAPI reference

**Generated — do not edit by hand.** Run `node scripts/ohapi-docs.mjs` to refresh.

Captured from `https://api.oh.xyz/openapi.json`. Spec version `1.0.0`, OpenAPI `3.0.3`.

This is the provider's own machine-readable description of itself. Where it
disagrees with `server/ohapi.ts`, the divergence is deliberate and recorded in
`OHAPI_INTEGRATION.md` — this file does not overrule observed behaviour.

64 operations across 12 groups.

## Audio

### `POST /api/v1/audio/notes`

Generate Audio Note

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `room_id` | string | yes | Room ID from the create room endpoint |
| `prompt` | string | yes | Text for the character to speak |

**200** — Audio generated successfully

```json
{
  "url": "your-audio-url-here"
}
```

## Characters

### `PATCH /api/v1/characters/{characterId}`

Update Character

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `firstName` | string | no | Character's first name |
| `lastName` | string | no | Character's last name |
| `biography` | string | no | Character biography/backstory |
| `alias` | string | no | Character alias/nickname |
| `job` | string | no | Job title |
| `whereYouLive` | string | no | Location where character lives |
| `dateOfBirth` | string | no | Date of birth (ISO format: YYYY-MM-DD). Age will be calculated and must be 21+ |
| `gender` | string | no | Character gender |
| `nationality` | enum(American \| Brazilian \| Russian \| Colombian \| Ukrainian \| Japanese \| Filipino \| Thai \| Mexican \| Canadian \| British \| Korean (South) \| Vietnamese \| Indian \| Chinese \| German \| French \| Italian \| Spanish \| Australian \| Swedish \| Polish \| Dutch \| Venezuelan \| Dominican \| Argentine \| Peruvian \| Czech \| Romanian \| Hungarian \| Turkish \| Lebanese \| Israeli \| Greek \| Serbian \| Croatian \| Bulgarian \| Belgian \| Norwegian \| Danish \| Finnish \| Irish \| Scottish \| Portuguese \| New Zealander \| South African \| Jamaican \| Puerto Rican \| Cuban \| Costa Rican \| Panamanian \| Salvadoran \| Nigerian \| Ghanaian \| Kenyan \| Moroccan \| Algerian \| Egyptian \| Tunisian \| Pakistani \| Bangladeshi \| Indonesian \| Malaysian \| Singaporean \| Taiwanese \| Hong Konger \| Emirati (UAE) \| Saudi \| Qatari \| Kuwaiti \| Jordanian \| Syrian \| Iranian \| Afghan \| Kazakh \| Georgian \| Armenian \| Lithuanian \| Latvian \| Estonian \| Belarusian \| Moldovan \| Slovak \| Slovenian \| Austrian \| Swiss \| Icelandic \| Maltese \| Cypriot \| Albanian \| Bosnian \| Macedonian \| Montenegrin \| Chilean \| Ecuadorian \| Paraguayan \| Uruguayan \| Bolivian \| Honduran \| Nicaraguan) | no | Character nationality |
| `ethnicity` | enum(Caucasian / White \| Latina / Hispanic \| Black / African-American \| Asian (East Asian) \| Mixed / Biracial \| Brazilian \| Russian / Slavic \| Colombian \| Ukrainian \| Japanese \| Filipina \| Thai \| Korean \| Mexican \| Ebony / West African \| Chinese \| Indian (South Asian) \| Vietnamese \| Middle Eastern / Arab \| Mediterranean (Greek/Italian/Spanish) \| Scandinavian / Nordic \| Venezuelan \| Dominican \| Argentine \| Peruvian \| Eastern European \| Puerto Rican \| Cuban \| Asian-Caucasian Mix \| Black-Caucasian Mix \| Latina-Caucasian Mix \| Pawg (White with big assets) \| BBC-adjacent Black \| Light-skin Black \| Caramel / Latina \| Olive / Mediterranean \| Pale / Porcelain White \| Tanned / Beach Latina \| Redhead / Ginger \| Blonde Scandinavian \| Brunette European \| Jewish (Ashkenazi) \| Persian / Iranian \| Turkish \| Lebanese \| Armenian \| Native American \| Pacific Islander \| Polynesian / Samoan \| Moroccan / North African \| Egyptian \| Algerian \| Nigerian \| Ghanaian \| Kenyan \| South African (White) \| South African (Coloured) \| Jamaican \| Trinidadian \| Barbadian \| Punjabi / North Indian \| Tamil / South Indian \| Bengali \| Pakistani \| Indonesian \| Malaysian \| Singaporean Chinese \| Taiwanese \| Hong Kong Chinese \| Eurasian (Asian + White) \| Blasian (Black + Asian) \| Afro-Latina \| Arab \| Kurdish \| Greek \| Italian \| Spanish \| Portuguese \| French \| German \| Dutch \| Polish \| Czech \| Romanian \| Hungarian \| Serbian \| Croatian \| Bulgarian \| Albanian \| Bosnian \| Gypsy / Romani \| Maori \| Aboriginal Australian \| Hmong \| Cambodian \| Lao \| Mongolian \| Kazakh \| Uyghur \| Afghan / Pashtun) | no | Character ethnicity |
| `height` | string | no | Character height |
| `bodyBuild` | enum(Slim \| Petite \| Athletic \| Toned \| Curvy \| Hourglass \| Slender \| Fit \| Thick \| BBW \| Skinny \| Muscular \| Chubby \| Voluptuous \| Lean \| Model-thin \| Pear shape \| Busty athletic \| Soft & curvy \| Amazon / tall & strong \| Buxom \| Average \| Busty \| Slim, athletic, \| Busty hourglass \| Athletic-Curvy, \| Petite hourglass \| Tall, Athletic Hourglass \| Muscular-athletic \| Athletic-Curvy) | no | Body build type |
| `bodyShape` | enum(Hourglass \| Pear \| Apple \| Rectangle \| Inverted triangle \| Slim hourglass \| Thick hourglass \| Bottom-heavy pear \| Top-heavy \| Balanced curvy \| Athletic rectangle \| Soft pear \| Petite hourglass \| Busty rectangle \| Bubble butt pear \| Slim-thick \| Coke-bottle \| Shelf booty \| Voluptuous hourglass \| Chubby apple) | no | Body shape |
| `buttSize` | enum(Big \| Round & full \| Bubble butt \| Thick \| Jiggly \| Huge \| Average \| Small \| Shelf-like \| Peach \| Juicy \| Massive \| Firm & round \| Flat \| Phat \| Heart-shaped \| Perky \| Wide) | no | Butt size |
| `hairLength` | enum(Long (mid-back to waist) \| Very long (waist to hips) \| Shoulder-length \| Extra long (classic length – below butt) \| Medium / lob (long bob, just past shoulders) \| Short bob \| Chin-length bob \| Pixie cut \| Butt-length \| Chest / bra-strap length \| Hip-length \| Short layered \| Tailbone length \| Shaved sides + long top \| Bald / completely shaved \| Buzzcut \| Asymmetrical bob \| Undercut \| Mid-back \| Knee-length (extreme rare) \| Floor-length (extreme fantasy) \| Short crop \| Pageboy \| Shag / wolf cut \| Mullet (modern sexy version)) | no | Hair length |
| `hairColour` | enum(Black \| Dark Brown \| Blonde \| Light Brown \| Platinum Blonde \| Jet Black \| Golden Blonde \| Honey Blonde \| Strawberry Blonde \| Auburn \| Chestnut Brown \| Ash Blonde \| Caramel Brown \| Chocolate Brown \| Dirty Blonde \| Natural Red / Ginger \| Raven Black \| Sandy Blonde \| Rose Gold \| Silver / Grey \| Pastel Pink \| Ombré (dark to blonde) \| Balayage Blonde \| Copper Red \| Violet / Purple \| Blue \| White Blonde \| Burgundy \| Ice Blonde \| Butter Blonde \| Bronde \| Champagne Blonde \| Smokey Lilac \| Fiery Red \| Mahogany \| Green \| Dark Auburn \| Ash Brown \| Peach \| Lavender) | no | Hair colour |
| `eyeColour` | enum(Blue \| Hazel \| Green \| Brown / Dark Brown \| Grey \| Light Blue \| Ice Blue / Pale Blue \| Amber / Golden \| Heterochromia (two different colors) \| Dark Brown (almost black) \| Emerald Green \| Honey Brown \| Grey-Blue \| Violet / Purple (real or contacts) \| Aqua / Turquoise \| Grey-Green \| Central Heterochromia (e.g., brown with green ring) \| Deep Green \| Sky Blue \| Steel Grey \| Golden Brown \| Red / Albino \| Cat-like Yellow/Gold \| Sectoral Heterochromia (pie slice) \| Bright Green) | no | Eye colour |
| `skinTone` | enum(Light / Fair \| Tan / Golden \| Olive / Mediterranean \| Caramel / Light Brown \| Medium Brown \| Deep Tan / Bronzed \| Porcelain / Very Pale \| Deep Brown / Chocolate \| Ebony / Very Dark \| Honey \| Beige \| Warm Ivory \| Golden Olive \| Light Caramel \| Mocha \| Rich Brown \| Sun-Kissed \| Alabaster \| Latte \| Mahogany \| Warm Honey \| Light Olive \| Tawny \| Espresso \| Pale Ivory) | no | Skin tone |
| `breastSize` | enum(C cup \| D cup \| DD / E cup \| B cup \| Natural C \| Perky D \| Big natural (DD–F) \| Small / A–B \| Large / F–G \| Fake / Obviously augmented \| Full C \| Perfect handful (firm B–C) \| Huge / H+ \| Petite / Flat-to-A \| Bolt-ons (fake D–DD) \| Teardrop implants \| Very perky C \| Full DD \| Small & perky \| Massive naturals (G–H) \| Athletic small (A–B) \| Round fake DD \| Tiny / AA–A \| Oversized implants (H–K) \| Soft & full D) | no | Breast size |
| `breastPertness` | enum(Perky \| Firm & perky \| Natural perky \| Full & perky \| Slightly pendulous (natural hang) \| Very perky / youthful \| Teardrop shape \| Round & firm \| Soft & natural \| Augmented / fake perky \| Perfect teardrop \| High & firm \| Full but soft \| Athletic / toned & perky \| Gently sloping \| Heavy & full (natural sag) \| Bolt-on / obviously fake round \| Puffy nipples + perky \| East-West (point outward) \| Slightly sagging (post-baby natural) \| Perfectly round implants \| Torpedo / tubular \| Wide-set & perky \| Small & super perky \| Mature / naturally pendulous) | no | Breast pertness |
| `nippleColour` | enum(Light pink \| Pink \| Rose / Medium pink \| Dark pink \| Light brown \| Medium brown \| Dark brown \| Pale pink (almost white) \| Rosy brown \| Deep brown / Chocolate \| Almost black \| Peachy pink \| Mauve \| Tan brown \| Reddish-pink \| Dusky rose \| Caramel brown \| Puffy light pink \| Puffy dark pink \| Inverted (dark pink/brown)) | no | Nipple colour |
| `vaginaHair` | enum(Completely shaved / bald \| Landing strip \| Smooth wax (Brazilian – everything off) \| Neat triangle \| Small trimmed patch \| Hollywood (100 % bare) \| Thin landing strip \| Full bush (natural 70s style) \| Trimmed short / low maintenance \| Heart shape \| Brazilian with tiny strip \| Natural but shaped \| Dyed to match hair \| Arrow / V shape \| Partially shaved sides \| Lightning bolt \| Au naturel / untouched bush \| Short & curly (Afro-textured) \| Thin vertical strip \| Completely natural long \| Diamond shape \| French wax (strip + lips bare) \| Designer (letters/symbols) \| Colored bush (pink/blue/etc.) \| Wild & untrimmed) | no | Vagina hair style |
| `vaginaSize` | enum(Tight \| Very tight \| Super tight \| Snug \| Average \| Petite tight \| Extremely tight \| Youthfully tight \| Slightly looser \| Perfectly snug \| Tight but accommodating \| Incredibly tight \| Normal \| Loose & wet \| Very accommodating \| Post-baby looser \| Gripping \| Relaxed \| Well-used \| Milf-level relaxed) | no | Vagina size |
| `orientation` | enum(Straight \| Bisexual \| Mostly straight \| Bi-curious \| Pansexual \| Lesbian \| Heteroflexible \| Bicurious (leans men) \| Bicurious (leans women) \| Demisexual \| Queer \| Mostly lesbian \| Homoflexible \| Asexual (but enjoys sex with partner) \| Fluid \| Gay (Men) \| Experimenting \| Open to anything \| Straight but plays with girls \| 90/10 (mostly straight)) | no | Character's sexual orientation. Affects who the character is attracted to in text conversations. |
| `sexualExperience` | enum(Virgin \| Almost virgin \| Very limited \| Moderate \| Experienced \| Very experienced \| Highly experienced \| 100+ partners \| Former escort \| Nymphomaniac \| Only relationships \| Mostly one-night stands \| Lots of threesomes \| Swinger \| Porn-level \| Innocent but curious \| Sheltered then wild \| Reformed good girl \| Always slutty \| Recently awakened) | no | Character's sexual experience level. Affects the character's personality and how they discuss sexual topics in text conversations. |
| `kinks` | enum(Daddy kink / DDLG \| Breeding / creampie \| Light bondage \| Spanking \| Choking / breath play \| Anal play \| Degradation \| Praise kink \| CNC / consensual non-consent \| Petplay \| Exhibitionism \| Voyeurism \| Free use \| Orgasm control / denial \| Overstimulation \| Size queen \| Cuckquean / hotpast \| Pegging \| Foot fetish \| Roleplay \| Mommy kink \| Ageplay (legal adults only) \| Raceplay \| Impact play \| Wax play \| Public / semi-public \| Gangbang fantasy \| Double penetration \| Squirting focus \| Edging \| Watersports \| Findom \| Chastity / keyholding \| Latex / leather \| Bimbofication \| Corruption kink)[] | no | Character's sexual preferences and kinks. Used to shape the character's personality and behavior in text conversations only — they do not control image or video generation capabilities. |
| `sexPositions` | enum(Doggy style \| Missionary \| Cowgirl \| Reverse cowgirl \| Spooning \| Prone bone \| 69 \| Face-sitting \| Standing doggy \| Lotus \| Butterfly (edge of bed) \| Deep missionary (legs on shoulders) \| Blowjob (kneeling) \| Anal doggy \| Seated cowgirl / lap sex \| The Hot Seat (reverse lap) \| Pillow-under-hips missionary \| Full nelson \| Piledriver \| Double penetration \| Tit job \| Side-by-side / lazy doggy \| Shower sex (standing doggy) \| Couch doggy \| Amazon position \| Side-by-side sex \| Car sex cowgirl \| Lazy spooning \| Deep missionary ankles locked \| Finish-in-mouth kneeling blowjob)[] | no | Character's preferred sex positions. These define the character's personality and preferences for text conversations only — they do not control image or video generation capabilities. |
| `relationshipStyle` | enum(Monogamous girlfriend \| Devoted housewife \| Free-use 24/7 \| Stay-at-home girlfriend \| Open relationship \| Trophy girlfriend \| Submissive girlfriend \| Dominant girlfriend \| Casual FWB \| Sugar baby \| Collared & owned \| Hotwife \| Cuckquean \| Polyamorous \| Secret affair \| Traditional 1950s \| Brat to be tamed \| Fiancée \| Live-in slut \| Long-distance girlfriend) | no | Character's relationship dynamic with the user. Affects how the character behaves and relates to the user in text conversations. |
| `relationshipStatus` | enum(Single \| In a relationship \| Engaged \| Married \| Divorced \| Widowed \| It's complicated \| Open relationship \| Situationship \| Single and looking \| Single not looking \| Taken but bored \| Friends with benefits \| Dating around \| Exclusively yours) | no | Character's relationship status. Part of the character's backstory, affects text conversation context. |
| `interests` | enum(Dancing \| Yoga \| Work \| Gaming \| Streaming \| Cosplay \| Anime \| Nature \| Animals \| Hiking \| Spirituality \| Exercise \| Reading \| Travelling \| Chess \| Tattoos \| Art \| Drawing \| Music \| Gym \| Running \| Tanning \| Dining out \| Cooking \| Partying \| Sports \| Magic \| Museums \| History \| Writing \| Watching movies \| Golf \| Tennis \| Photography \| Astrology \| Nightlife \| Adventure \| Fashion \| Soccer \| Theatre \| Cycling \| Exercising \| Business \| Clean eating \| The outdoors \| Baking \| Piano \| Charity \| Wine \| Restaurants \| Tech \| Psychology \| Meditation \| Chatting \| Gardening \| Painting \| Swimming \| Fitness \| Volleyball \| Movies \| Skateboarding \| Farming \| Climbing \| Camping \| Sailing \| Scuba diving \| Weightlifting \| Gymnastics \| Mixed martial arts \| Pole dancing \| Wine tasting \| Mountaineering \| Rowing \| Hockey \| Judo \| Manga \| Beach activities \| Digital art \| Football \| Motorcycles \| DIY \| Science \| Technology \| Shooting \| Driving \| Exploring \| Boxing \| Comedy \| Cars \| Rock music \| Jazz \| Shopping \| Health \| Stocks \| Films \| Basketball \| Dance \| Dogs \| Creativity \| Journalism \| Clubbing \| Raves \| Cheerleading \| Filmmaking \| Beach \| Travel \| Netflix \| Video games \| Home design \| Social media \| Acting \| Horses \| Beauty \| True crime)[] | no | Character interests |
| `personality` | enum(Sweet & innocent \| Bratty \| Bubbly / genki \| Shy & submissive \| Flirty tease \| Tsundere \| Yandere \| Confident boss babe \| Nerdy / gamer girl \| Spoiled princess \| Girl-next-door \| Ice queen (melts for you) \| Himbo-level ditzy \| Dominant & teasing \| Obsessed / clingy \| Low-maintenance chill \| High-maintenance diva \| Gothic / alt girl \| Bookworm / quiet intellectual \| Hyper horny nympho \| Reformed good girl \| Total bimbo \| Caring mommy vibe \| Sassy & sarcastic \| Daddy's little princess) | no | Character's personality archetype. Shapes the character's overall behavior and tone in text conversations. |
| `sexDrive` | enum(Very high \| Hypersexual nympho \| High \| Always horny \| Average \| Touch-starved \| Insatiable \| High but shy \| Moderate \| Low until aroused then wild \| Once a day minimum \| Morning sex addict \| Only horny when ovulating \| Switches normal to crazy \| Low \| Very low cuddly \| Asexual but enjoys pleasing \| Permanently in heat \| Night owl horny \| Needs it to fall asleep) | no | Character's sex drive level. Affects the character's eagerness and initiative in text conversations. |
| `conversationStyle` | enum(Flirty & teasing \| Sweet & innocent \| Bratty & sassy \| Shy & soft-spoken \| Bubbly & giggly \| Dirty talk queen \| Proper & polite \| Valley girl \| Weeb / anime speech \| Tsundere \| Baby-talk / little space \| Foul-mouthed & trashy \| Sarcastic & witty \| Submissive & obedient \| Dominant & commanding \| Country / southern drawl \| Nerdy & rambling \| High-maintenance princess \| Low-key & chill \| Constant compliments & praise) | no | Character's conversation style. Controls the tone and manner of the character's text responses. |
| `attitude` | enum(Sweet & innocent \| Bratty \| Bubbly & cheerful \| Shy & submissive \| Flirty tease \| Tsundere \| Yandere \| Spoiled princess \| Confident boss babe \| Nerdy gamer girl \| Ice queen \| Sassy & sarcastic \| Clingy & obsessed \| Dominant & commanding \| Girl-next-door \| Gothic / alt \| Ditzy bimbo \| Caring mommy \| High-maintenance diva \| Low-key chill) | no | Character's attitude. Influences the character's demeanor in text conversations. |
| `voiceId` | string | no | S3 URI for the voice reference audio |
| `audioSpeed` | number | no | Audio playback speed multiplier (0.5-2.0) _(default `0.5`)_ |

**200** — Character updated successfully

```json
{
  "success": true,
  "characterId": 737,
  "updatedFields": [
    "firstName",
    "lastName"
  ],
  "message": "Character updated successfully. 2 field(s) modified."
}
```

**400** — Bad request - Invalid input

**401** — Unauthorized - Missing or invalid API key

**403** — Forbidden - Insufficient permissions

**404** — Character not found

**500** — Internal server error

### `GET /api/v1/characters/api-characters/{b2bClientId}`

Get API characters for a B2B client

**200** — List of characters with SFW images

```json
[
  {
    "cid": "1",
    "name": "Ava",
    "gender": "Female",
    "job": "Model",
    "dateOfBirth": "2003-05-10",
    "level": "L3",
    "body_type": "Athletic",
    "breast_size": "Large",
    "ethnicity": "Caucasian",
    "eye_color": "Green",
    "hair_length": "Medium",
    "hair_color": "Ginger",
    "orientation": "Straight",
    "kinks": [
      "Being dominated",
      "Office romance",
      "Group sex"
    ],
    "personality": [
      "Charming: Sprinkle in compliments that make {user} feel special.",
      "Witty: Responses should be clever, concise, and surprising.",
      "Subordinate: Responses should be respectful and deferential."
    ],
    "management": {
      "max_daily_text": 3,
      "max_daily_image": 3
    },
    "image": {
      "loras": {
        "female_face_1": 0.75,
        "female_face_2": 0.75
      },
      "model": "flux"
    },
    "image_url": "https://d3mpf1svyo6ceu.cloudfront.net/char-profile-pics/screenshot-2025-03-07-at-15.52.23-large.png",
    "character_type": "original"
  }
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/attitudes`

Get allowed attitudes

**200** — List of attitudes

```json
[
  "Sweet & innocent",
  "Bratty",
  "Bubbly & cheerful",
  "Shy & submissive",
  "Flirty tease"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/body-builds`

Get allowed body builds

**200** — List of body builds

```json
[
  "Slim",
  "Petite",
  "Athletic",
  "Curvy",
  "Hourglass",
  "Fit"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/body-shapes`

Get allowed body shapes

**200** — List of body shapes

```json
[
  "Hourglass",
  "Pear",
  "Apple",
  "Rectangle",
  "Slim hourglass"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/breast-pertness`

Get allowed breast pertness options

**200** — List of breast pertness options

```json
[
  "Perky",
  "Firm & perky",
  "Natural perky",
  "Teardrop shape"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/breast-sizes`

Get allowed breast sizes

**200** — List of breast sizes

```json
[
  "C cup",
  "D cup",
  "DD / E cup",
  "B cup",
  "Natural C"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/butt-sizes`

Get allowed butt sizes

**200** — List of butt sizes

```json
[
  "Big",
  "Round & full",
  "Bubble butt",
  "Thick",
  "Jiggly"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/conversation-styles`

Get allowed conversation styles

**200** — List of conversation styles

```json
[
  "Flirty & teasing",
  "Sweet & innocent",
  "Bratty & sassy",
  "Shy & soft-spoken"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/ethnicities`

Get allowed ethnicities

**200** — List of ethnicities

```json
[
  "Caucasian / White",
  "Latina / Hispanic",
  "Black / African-American",
  "Asian (East Asian)"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/eye-colours`

Get allowed eye colours

**200** — List of eye colours

```json
[
  "Blue",
  "Green",
  "Brown / Dark Brown",
  "Hazel",
  "Grey"
]
```

**401** — Unauthorized - invalid API key

### `POST /api/v1/characters/generate`

Generate AI Character

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `b2bClientId` | string | no | B2B client ID (required if ohFunCreatorId not provided) |
| `ohFunCreatorId` | string | no | OhFun creator ID (required if b2bClientId not provided) |
| `nationality` | enum(American \| Brazilian \| Russian \| Colombian \| Ukrainian \| Japanese \| Filipino \| Thai \| Mexican \| Canadian \| British \| Korean (South) \| Vietnamese \| Indian \| Chinese \| German \| French \| Italian \| Spanish \| Australian \| Swedish \| Polish \| Dutch \| Venezuelan \| Dominican \| Argentine \| Peruvian \| Czech \| Romanian \| Hungarian \| Turkish \| Lebanese \| Israeli \| Greek \| Serbian \| Croatian \| Bulgarian \| Belgian \| Norwegian \| Danish \| Finnish \| Irish \| Scottish \| Portuguese \| New Zealander \| South African \| Jamaican \| Puerto Rican \| Cuban \| Costa Rican \| Panamanian \| Salvadoran \| Nigerian \| Ghanaian \| Kenyan \| Moroccan \| Algerian \| Egyptian \| Tunisian \| Pakistani \| Bangladeshi \| Indonesian \| Malaysian \| Singaporean \| Taiwanese \| Hong Konger \| Emirati (UAE) \| Saudi \| Qatari \| Kuwaiti \| Jordanian \| Syrian \| Iranian \| Afghan \| Kazakh \| Georgian \| Armenian \| Lithuanian \| Latvian \| Estonian \| Belarusian \| Moldovan \| Slovak \| Slovenian \| Austrian \| Swiss \| Icelandic \| Maltese \| Cypriot \| Albanian \| Bosnian \| Macedonian \| Montenegrin \| Chilean \| Ecuadorian \| Paraguayan \| Uruguayan \| Bolivian \| Honduran \| Nicaraguan) | yes | Character nationality |
| `ethnicity` | enum(Caucasian / White \| Latina / Hispanic \| Black / African-American \| Asian (East Asian) \| Mixed / Biracial \| Brazilian \| Russian / Slavic \| Colombian \| Ukrainian \| Japanese \| Filipina \| Thai \| Korean \| Mexican \| Ebony / West African \| Chinese \| Indian (South Asian) \| Vietnamese \| Middle Eastern / Arab \| Mediterranean (Greek/Italian/Spanish) \| Scandinavian / Nordic \| Venezuelan \| Dominican \| Argentine \| Peruvian \| Eastern European \| Puerto Rican \| Cuban \| Asian-Caucasian Mix \| Black-Caucasian Mix \| Latina-Caucasian Mix \| Pawg (White with big assets) \| BBC-adjacent Black \| Light-skin Black \| Caramel / Latina \| Olive / Mediterranean \| Pale / Porcelain White \| Tanned / Beach Latina \| Redhead / Ginger \| Blonde Scandinavian \| Brunette European \| Jewish (Ashkenazi) \| Persian / Iranian \| Turkish \| Lebanese \| Armenian \| Native American \| Pacific Islander \| Polynesian / Samoan \| Moroccan / North African \| Egyptian \| Algerian \| Nigerian \| Ghanaian \| Kenyan \| South African (White) \| South African (Coloured) \| Jamaican \| Trinidadian \| Barbadian \| Punjabi / North Indian \| Tamil / South Indian \| Bengali \| Pakistani \| Indonesian \| Malaysian \| Singaporean Chinese \| Taiwanese \| Hong Kong Chinese \| Eurasian (Asian + White) \| Blasian (Black + Asian) \| Afro-Latina \| Arab \| Kurdish \| Greek \| Italian \| Spanish \| Portuguese \| French \| German \| Dutch \| Polish \| Czech \| Romanian \| Hungarian \| Serbian \| Croatian \| Bulgarian \| Albanian \| Bosnian \| Gypsy / Romani \| Maori \| Aboriginal Australian \| Hmong \| Cambodian \| Lao \| Mongolian \| Kazakh \| Uyghur \| Afghan / Pashtun) | yes | Character ethnicity |
| `dateOfBirth` | string | no | Date of birth. Character must be 21+. If not provided, defaults to 27 years old. |
| `firstName` | string | yes | Character first name |
| `lastName` | string | yes | Character last name |
| `biography` | string | yes | Character biography/backstory |
| `alias` | string | no | Character alias/nickname |
| `job` | string | no | Specific job title |
| `whereYouLive` | string | no | Location where character lives |
| `gender` | string | no | Character gender |
| `orientation` | enum(Straight \| Bisexual \| Mostly straight \| Bi-curious \| Pansexual \| Lesbian \| Heteroflexible \| Bicurious (leans men) \| Bicurious (leans women) \| Demisexual \| Queer \| Mostly lesbian \| Homoflexible \| Asexual (but enjoys sex with partner) \| Fluid \| Gay (Men) \| Experimenting \| Open to anything \| Straight but plays with girls \| 90/10 (mostly straight)) | no | Character's sexual orientation. Affects who the character is attracted to in text conversations. |
| `sexualExperience` | enum(Virgin \| Almost virgin \| Very limited \| Moderate \| Experienced \| Very experienced \| Highly experienced \| 100+ partners \| Former escort \| Nymphomaniac \| Only relationships \| Mostly one-night stands \| Lots of threesomes \| Swinger \| Porn-level \| Innocent but curious \| Sheltered then wild \| Reformed good girl \| Always slutty \| Recently awakened) | no | Character's sexual experience level. Affects the character's personality and how they discuss sexual topics in text conversations. |
| `kinks` | enum(Daddy kink / DDLG \| Breeding / creampie \| Light bondage \| Spanking \| Choking / breath play \| Anal play \| Degradation \| Praise kink \| CNC / consensual non-consent \| Petplay \| Exhibitionism \| Voyeurism \| Free use \| Orgasm control / denial \| Overstimulation \| Size queen \| Cuckquean / hotpast \| Pegging \| Foot fetish \| Roleplay \| Mommy kink \| Ageplay (legal adults only) \| Raceplay \| Impact play \| Wax play \| Public / semi-public \| Gangbang fantasy \| Double penetration \| Squirting focus \| Edging \| Watersports \| Findom \| Chastity / keyholding \| Latex / leather \| Bimbofication \| Corruption kink)[] | no | Character's sexual preferences and kinks. Used to shape the character's personality and behavior in text conversations only — they do not control image or video generation capabilities. |
| `sexPositions` | enum(Doggy style \| Missionary \| Cowgirl \| Reverse cowgirl \| Spooning \| Prone bone \| 69 \| Face-sitting \| Standing doggy \| Lotus \| Butterfly (edge of bed) \| Deep missionary (legs on shoulders) \| Blowjob (kneeling) \| Anal doggy \| Seated cowgirl / lap sex \| The Hot Seat (reverse lap) \| Pillow-under-hips missionary \| Full nelson \| Piledriver \| Double penetration \| Tit job \| Side-by-side / lazy doggy \| Shower sex (standing doggy) \| Couch doggy \| Amazon position \| Side-by-side sex \| Car sex cowgirl \| Lazy spooning \| Deep missionary ankles locked \| Finish-in-mouth kneeling blowjob)[] | no | Character's preferred sex positions. These define the character's personality and preferences for text conversations only — they do not control image or video generation capabilities. |
| `relationshipStyle` | enum(Monogamous girlfriend \| Devoted housewife \| Free-use 24/7 \| Stay-at-home girlfriend \| Open relationship \| Trophy girlfriend \| Submissive girlfriend \| Dominant girlfriend \| Casual FWB \| Sugar baby \| Collared & owned \| Hotwife \| Cuckquean \| Polyamorous \| Secret affair \| Traditional 1950s \| Brat to be tamed \| Fiancée \| Live-in slut \| Long-distance girlfriend) | no | Character's relationship dynamic with the user. Affects how the character behaves and relates to the user in text conversations. |
| `relationshipStatus` | enum(Single \| In a relationship \| Engaged \| Married \| Divorced \| Widowed \| It's complicated \| Open relationship \| Situationship \| Single and looking \| Single not looking \| Taken but bored \| Friends with benefits \| Dating around \| Exclusively yours) | no | Character's relationship status. Part of the character's backstory, affects text conversation context. |
| `interests` | enum(Dancing \| Yoga \| Work \| Gaming \| Streaming \| Cosplay \| Anime \| Nature \| Animals \| Hiking \| Spirituality \| Exercise \| Reading \| Travelling \| Chess \| Tattoos \| Art \| Drawing \| Music \| Gym \| Running \| Tanning \| Dining out \| Cooking \| Partying \| Sports \| Magic \| Museums \| History \| Writing \| Watching movies \| Golf \| Tennis \| Photography \| Astrology \| Nightlife \| Adventure \| Fashion \| Soccer \| Theatre \| Cycling \| Exercising \| Business \| Clean eating \| The outdoors \| Baking \| Piano \| Charity \| Wine \| Restaurants \| Tech \| Psychology \| Meditation \| Chatting \| Gardening \| Painting \| Swimming \| Fitness \| Volleyball \| Movies \| Skateboarding \| Farming \| Climbing \| Camping \| Sailing \| Scuba diving \| Weightlifting \| Gymnastics \| Mixed martial arts \| Pole dancing \| Wine tasting \| Mountaineering \| Rowing \| Hockey \| Judo \| Manga \| Beach activities \| Digital art \| Football \| Motorcycles \| DIY \| Science \| Technology \| Shooting \| Driving \| Exploring \| Boxing \| Comedy \| Cars \| Rock music \| Jazz \| Shopping \| Health \| Stocks \| Films \| Basketball \| Dance \| Dogs \| Creativity \| Journalism \| Clubbing \| Raves \| Cheerleading \| Filmmaking \| Beach \| Travel \| Netflix \| Video games \| Home design \| Social media \| Acting \| Horses \| Beauty \| True crime)[] | no | Character interests |
| `personality` | enum(Sweet & innocent \| Bratty \| Bubbly / genki \| Shy & submissive \| Flirty tease \| Tsundere \| Yandere \| Confident boss babe \| Nerdy / gamer girl \| Spoiled princess \| Girl-next-door \| Ice queen (melts for you) \| Himbo-level ditzy \| Dominant & teasing \| Obsessed / clingy \| Low-maintenance chill \| High-maintenance diva \| Gothic / alt girl \| Bookworm / quiet intellectual \| Hyper horny nympho \| Reformed good girl \| Total bimbo \| Caring mommy vibe \| Sassy & sarcastic \| Daddy's little princess) | no | Character's personality archetype. Shapes the character's overall behavior and tone in text conversations. |
| `sexDrive` | enum(Very high \| Hypersexual nympho \| High \| Always horny \| Average \| Touch-starved \| Insatiable \| High but shy \| Moderate \| Low until aroused then wild \| Once a day minimum \| Morning sex addict \| Only horny when ovulating \| Switches normal to crazy \| Low \| Very low cuddly \| Asexual but enjoys pleasing \| Permanently in heat \| Night owl horny \| Needs it to fall asleep) | no | Character's sex drive level. Affects the character's eagerness and initiative in text conversations. |
| `conversationStyle` | enum(Flirty & teasing \| Sweet & innocent \| Bratty & sassy \| Shy & soft-spoken \| Bubbly & giggly \| Dirty talk queen \| Proper & polite \| Valley girl \| Weeb / anime speech \| Tsundere \| Baby-talk / little space \| Foul-mouthed & trashy \| Sarcastic & witty \| Submissive & obedient \| Dominant & commanding \| Country / southern drawl \| Nerdy & rambling \| High-maintenance princess \| Low-key & chill \| Constant compliments & praise) | no | Character's conversation style. Controls the tone and manner of the character's text responses. |
| `attitude` | enum(Sweet & innocent \| Bratty \| Bubbly & cheerful \| Shy & submissive \| Flirty tease \| Tsundere \| Yandere \| Spoiled princess \| Confident boss babe \| Nerdy gamer girl \| Ice queen \| Sassy & sarcastic \| Clingy & obsessed \| Dominant & commanding \| Girl-next-door \| Gothic / alt \| Ditzy bimbo \| Caring mommy \| High-maintenance diva \| Low-key chill) | no | Character's attitude. Influences the character's demeanor in text conversations. |
| `height` | string | no | Character height |
| `bodyBuild` | enum(Slim \| Petite \| Athletic \| Toned \| Curvy \| Hourglass \| Slender \| Fit \| Thick \| BBW \| Skinny \| Muscular \| Chubby \| Voluptuous \| Lean \| Model-thin \| Pear shape \| Busty athletic \| Soft & curvy \| Amazon / tall & strong \| Buxom \| Average \| Busty \| Slim, athletic, \| Busty hourglass \| Athletic-Curvy, \| Petite hourglass \| Tall, Athletic Hourglass \| Muscular-athletic \| Athletic-Curvy) | no | Body build type |
| `bodyShape` | enum(Hourglass \| Pear \| Apple \| Rectangle \| Inverted triangle \| Slim hourglass \| Thick hourglass \| Bottom-heavy pear \| Top-heavy \| Balanced curvy \| Athletic rectangle \| Soft pear \| Petite hourglass \| Busty rectangle \| Bubble butt pear \| Slim-thick \| Coke-bottle \| Shelf booty \| Voluptuous hourglass \| Chubby apple) | no | Body shape |
| `buttSize` | enum(Big \| Round & full \| Bubble butt \| Thick \| Jiggly \| Huge \| Average \| Small \| Shelf-like \| Peach \| Juicy \| Massive \| Firm & round \| Flat \| Phat \| Heart-shaped \| Perky \| Wide) | no | Butt size |
| `hairLength` | enum(Long (mid-back to waist) \| Very long (waist to hips) \| Shoulder-length \| Extra long (classic length – below butt) \| Medium / lob (long bob, just past shoulders) \| Short bob \| Chin-length bob \| Pixie cut \| Butt-length \| Chest / bra-strap length \| Hip-length \| Short layered \| Tailbone length \| Shaved sides + long top \| Bald / completely shaved \| Buzzcut \| Asymmetrical bob \| Undercut \| Mid-back \| Knee-length (extreme rare) \| Floor-length (extreme fantasy) \| Short crop \| Pageboy \| Shag / wolf cut \| Mullet (modern sexy version)) | no | Hair length |
| `hairColour` | enum(Black \| Dark Brown \| Blonde \| Light Brown \| Platinum Blonde \| Jet Black \| Golden Blonde \| Honey Blonde \| Strawberry Blonde \| Auburn \| Chestnut Brown \| Ash Blonde \| Caramel Brown \| Chocolate Brown \| Dirty Blonde \| Natural Red / Ginger \| Raven Black \| Sandy Blonde \| Rose Gold \| Silver / Grey \| Pastel Pink \| Ombré (dark to blonde) \| Balayage Blonde \| Copper Red \| Violet / Purple \| Blue \| White Blonde \| Burgundy \| Ice Blonde \| Butter Blonde \| Bronde \| Champagne Blonde \| Smokey Lilac \| Fiery Red \| Mahogany \| Green \| Dark Auburn \| Ash Brown \| Peach \| Lavender) | no | Hair colour |
| `eyeColour` | enum(Blue \| Hazel \| Green \| Brown / Dark Brown \| Grey \| Light Blue \| Ice Blue / Pale Blue \| Amber / Golden \| Heterochromia (two different colors) \| Dark Brown (almost black) \| Emerald Green \| Honey Brown \| Grey-Blue \| Violet / Purple (real or contacts) \| Aqua / Turquoise \| Grey-Green \| Central Heterochromia (e.g., brown with green ring) \| Deep Green \| Sky Blue \| Steel Grey \| Golden Brown \| Red / Albino \| Cat-like Yellow/Gold \| Sectoral Heterochromia (pie slice) \| Bright Green) | no | Eye colour |
| `skinTone` | enum(Light / Fair \| Tan / Golden \| Olive / Mediterranean \| Caramel / Light Brown \| Medium Brown \| Deep Tan / Bronzed \| Porcelain / Very Pale \| Deep Brown / Chocolate \| Ebony / Very Dark \| Honey \| Beige \| Warm Ivory \| Golden Olive \| Light Caramel \| Mocha \| Rich Brown \| Sun-Kissed \| Alabaster \| Latte \| Mahogany \| Warm Honey \| Light Olive \| Tawny \| Espresso \| Pale Ivory) | no | Skin tone |
| `breastSize` | enum(C cup \| D cup \| DD / E cup \| B cup \| Natural C \| Perky D \| Big natural (DD–F) \| Small / A–B \| Large / F–G \| Fake / Obviously augmented \| Full C \| Perfect handful (firm B–C) \| Huge / H+ \| Petite / Flat-to-A \| Bolt-ons (fake D–DD) \| Teardrop implants \| Very perky C \| Full DD \| Small & perky \| Massive naturals (G–H) \| Athletic small (A–B) \| Round fake DD \| Tiny / AA–A \| Oversized implants (H–K) \| Soft & full D) | no | Breast size |
| `breastPertness` | enum(Perky \| Firm & perky \| Natural perky \| Full & perky \| Slightly pendulous (natural hang) \| Very perky / youthful \| Teardrop shape \| Round & firm \| Soft & natural \| Augmented / fake perky \| Perfect teardrop \| High & firm \| Full but soft \| Athletic / toned & perky \| Gently sloping \| Heavy & full (natural sag) \| Bolt-on / obviously fake round \| Puffy nipples + perky \| East-West (point outward) \| Slightly sagging (post-baby natural) \| Perfectly round implants \| Torpedo / tubular \| Wide-set & perky \| Small & super perky \| Mature / naturally pendulous) | no | Breast pertness |
| `nippleColour` | enum(Light pink \| Pink \| Rose / Medium pink \| Dark pink \| Light brown \| Medium brown \| Dark brown \| Pale pink (almost white) \| Rosy brown \| Deep brown / Chocolate \| Almost black \| Peachy pink \| Mauve \| Tan brown \| Reddish-pink \| Dusky rose \| Caramel brown \| Puffy light pink \| Puffy dark pink \| Inverted (dark pink/brown)) | no | Nipple colour |
| `vaginaHair` | enum(Completely shaved / bald \| Landing strip \| Smooth wax (Brazilian – everything off) \| Neat triangle \| Small trimmed patch \| Hollywood (100 % bare) \| Thin landing strip \| Full bush (natural 70s style) \| Trimmed short / low maintenance \| Heart shape \| Brazilian with tiny strip \| Natural but shaped \| Dyed to match hair \| Arrow / V shape \| Partially shaved sides \| Lightning bolt \| Au naturel / untouched bush \| Short & curly (Afro-textured) \| Thin vertical strip \| Completely natural long \| Diamond shape \| French wax (strip + lips bare) \| Designer (letters/symbols) \| Colored bush (pink/blue/etc.) \| Wild & untrimmed) | no | Vagina hair style |
| `vaginaSize` | enum(Tight \| Very tight \| Super tight \| Snug \| Average \| Petite tight \| Extremely tight \| Youthfully tight \| Slightly looser \| Perfectly snug \| Tight but accommodating \| Incredibly tight \| Normal \| Loose & wet \| Very accommodating \| Post-baby looser \| Gripping \| Relaxed \| Well-used \| Milf-level relaxed) | no | Vagina size |
| `additionalDescription` | string | no | Free-text traits added to the reference image that the structured fields can't express. Examples: `nose piercing`, `hooped earrings`, `cherry blossom sleeve tattoo`, `wire-frame glasses`, `thin scar above the left eyebrow`. |

**201** — AI character generated successfully

```json
{
  "success": true,
  "characterId": "550e8400-e29b-41d4-a716-446655440000",
  "character": {
    "firstName": "Emma",
    "lastName": "Rose",
    "alias": "EmmaGamer",
    "biography": "A passionate gamer and content creator...",
    "nationality": "American",
    "ethnicity": "Caucasian",
    "dateOfBirth": "1999-06-15",
    "gender": "Female",
    "orientation": "Bisexual",
    "job": "Full-time streamer",
    "whereYouLive": "Los Angeles, CA",
    "relationshipStatus": "Single and looking",
    "interests": [
      "Gaming",
      "Cosplay",
      "Anime"
    ],
    "personality": "Bubbly / genki"
  },
  "images": {
    "nsfw_image": "https://s3.amazonaws.com/bucket/nsfw/...",
    "sfw_image": "https://s3.amazonaws.com/bucket/sfw/..."
  },
  "message": "Character generated successfully"
}
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/hair-colours`

Get allowed hair colours

**200** — List of hair colours

```json
[
  "Black",
  "Dark Brown",
  "Blonde",
  "Platinum Blonde",
  "Natural Red / Ginger"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/hair-lengths`

Get allowed hair lengths

**200** — List of hair lengths

```json
[
  "Long (mid-back to waist)",
  "Shoulder-length",
  "Short bob",
  "Pixie cut"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/interests`

Get allowed interests

**200** — List of interests

```json
[
  "Dancing",
  "Yoga",
  "Gaming",
  "Cosplay",
  "Anime",
  "Hiking",
  "Music",
  "Gym"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/jobs`

Get job suggestions

**200** — List of job suggestions

```json
[
  "College student",
  "Content creator",
  "Nurse",
  "Flight attendant",
  "Social media influencer",
  "Barista",
  "Personal assistant",
  "Fitness trainer",
  "Teacher",
  "Yoga instructor",
  "Server",
  "Dancer",
  "Cosplayer",
  "Model",
  "Corporate professional",
  "Artist",
  "Cheerleader",
  "Gamer / streamer",
  "Photographer",
  "Software engineer",
  "Marketing manager",
  "Designer",
  "Real estate agent",
  "Entrepreneur",
  "Hair stylist",
  "Makeup artist",
  "Event planner",
  "Travel blogger",
  "Chef",
  "Actress",
  "Singer",
  "Writer",
  "Journalist",
  "Lawyer",
  "Doctor",
  "Veterinarian",
  "Psychologist",
  "Architect",
  "Interior designer",
  "Fashion designer",
  "Musician",
  "DJ",
  "Bartender",
  "Lifeguard",
  "Massage therapist",
  "Nail technician",
  "Personal shopper",
  "Tour guide",
  "Pilot",
  "Marine biologist"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/kinks`

Get allowed kinks

**200** — List of kinks

```json
[
  "Daddy kink / DDLG",
  "Light bondage",
  "Spanking",
  "Praise kink",
  "Roleplay"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/nationalities`

Get allowed nationalities

**200** — List of nationalities

```json
[
  "American",
  "Brazilian",
  "Russian",
  "Colombian",
  "Ukrainian",
  "Japanese"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/nipple-colours`

Get allowed nipple colours

**200** — List of nipple colours

```json
[
  "Light pink",
  "Pink",
  "Rose / Medium pink",
  "Dark pink",
  "Light brown"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/orientations`

Get allowed orientations

**200** — List of orientations

```json
[
  "Straight",
  "Bisexual",
  "Mostly straight",
  "Bi-curious",
  "Pansexual"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/personalities`

Get allowed personalities

**200** — List of personalities

```json
[
  "Sweet & innocent",
  "Bratty",
  "Bubbly / genki",
  "Shy & submissive",
  "Flirty tease"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/relationship-statuses`

Get allowed relationship statuses

**200** — List of relationship statuses

```json
[
  "Single",
  "In a relationship",
  "Engaged",
  "Married",
  "It's complicated"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/relationship-styles`

Get allowed relationship styles (Drupal)

**200** — List of relationship styles

```json
[
  "Monogamous girlfriend",
  "Devoted housewife",
  "Open relationship",
  "Casual FWB"
]
```

**401** — Unauthorized - invalid API key

### `POST /api/v1/characters/save`

Save AI Character to Drupal

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `characterId` | string | yes | Character ID from generation step |
| `b2bClientId` | string | no | B2B client ID (required if ohFunCreatorId not provided) |
| `ohFunCreatorId` | string | no | OhFun creator ID (required if b2bClientId not provided) |
| `firstName` | string | no | Override first name |
| `lastName` | string | no | Override last name |
| `biography` | string | no | Override biography |
| `alias` | string | no | Override alias/nickname |
| `job` | string | no | Override job title |
| `whereYouLive` | string | no | Override location |
| `dateOfBirth` | string | no | Override date of birth. Character must be 21+. |
| `gender` | string | no | Override gender |
| `orientation` | string | no | Override orientation |
| `relationshipStatus` | string | no | Override relationship status |
| `interests` | enum(Dancing \| Yoga \| Work \| Gaming \| Streaming \| Cosplay \| Anime \| Nature \| Animals \| Hiking \| Spirituality \| Exercise \| Reading \| Travelling \| Chess \| Tattoos \| Art \| Drawing \| Music \| Gym \| Running \| Tanning \| Dining out \| Cooking \| Partying \| Sports \| Magic \| Museums \| History \| Writing \| Watching movies \| Golf \| Tennis \| Photography \| Astrology \| Nightlife \| Adventure \| Fashion \| Soccer \| Theatre \| Cycling \| Exercising \| Business \| Clean eating \| The outdoors \| Baking \| Piano \| Charity \| Wine \| Restaurants \| Tech \| Psychology \| Meditation \| Chatting \| Gardening \| Painting \| Swimming \| Fitness \| Volleyball \| Movies \| Skateboarding \| Farming \| Climbing \| Camping \| Sailing \| Scuba diving \| Weightlifting \| Gymnastics \| Mixed martial arts \| Pole dancing \| Wine tasting \| Mountaineering \| Rowing \| Hockey \| Judo \| Manga \| Beach activities \| Digital art \| Football \| Motorcycles \| DIY \| Science \| Technology \| Shooting \| Driving \| Exploring \| Boxing \| Comedy \| Cars \| Rock music \| Jazz \| Shopping \| Health \| Stocks \| Films \| Basketball \| Dance \| Dogs \| Creativity \| Journalism \| Clubbing \| Raves \| Cheerleading \| Filmmaking \| Beach \| Travel \| Netflix \| Video games \| Home design \| Social media \| Acting \| Horses \| Beauty \| True crime)[] | no | Character interests |
| `personality` | string | no | Override personality |
| `typeOfCharacter` | string | no | Type of character for OhChat |
| `bodyType` | number | no | Body type ID for OhChat |
| `eyeColor` | number | no | Eye color ID for OhChat |
| `hairColor` | number | no | Hair color ID for OhChat |
| `messagePrice` | number | no | Price per message |
| `subscriptionPrice` | number | no | Subscription price |
| `uid` | number | no | User ID in OhChat/Drupal system |

**200** — Character saved to Drupal successfully

```json
{
  "success": true,
  "characterId": 12345,
  "message": "Character saved successfully"
}
```

**401** — Unauthorized - invalid API key

**404** — Character not found in Postgres

### `GET /api/v1/characters/sex-drives`

Get allowed sex drives

**200** — List of sex drives

```json
[
  "Very high",
  "High",
  "Average",
  "Moderate",
  "Low"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/sex-positions`

Get allowed sex positions

**200** — List of sex positions

```json
[
  "Doggy style",
  "Missionary",
  "Cowgirl",
  "Reverse cowgirl",
  "Spooning"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/sexual-experiences`

Get allowed sexual experiences

**200** — List of sexual experiences

```json
[
  "Virgin",
  "Almost virgin",
  "Moderate",
  "Experienced",
  "Very experienced"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/skin-tones`

Get allowed skin tones

**200** — List of skin tones

```json
[
  "Light / Fair",
  "Tan / Golden",
  "Olive / Mediterranean",
  "Caramel / Light Brown"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/vagina-hair`

Get allowed vagina hair styles

**200** — List of vagina hair styles

```json
[
  "Completely shaved / bald",
  "Landing strip",
  "Neat triangle",
  "Natural but shaped"
]
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/characters/vagina-sizes`

Get allowed vagina sizes

**200** — List of vagina sizes

```json
[
  "Tight",
  "Very tight",
  "Snug",
  "Average",
  "Petite tight"
]
```

**401** — Unauthorized - invalid API key

## Characters V2

### `GET /api/v2/characters/{characterGuid}`

Get Generated Character

**200** — Generated character data retrieved

**404** — Character not found

### `GET /api/v2/characters/{characterGuid}/status`

Get Character Status

**200** — Character status retrieved

**404** — Character not found

### `POST /api/v2/characters/generate`

Generate AI Character

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `nationality` | string | yes | Character nationality. Use GET /api/v1/characters/nationalities for valid values |
| `ethnicity` | string | yes | Character ethnicity. Use GET /api/v1/characters/ethnicities for valid values |
| `firstName` | string | yes | Character first name |
| `lastName` | string | yes | Character last name |
| `biography` | string | yes | Character biography/bio text. Auto-generated if missing |
| `dateOfBirth` | string | no | Date of birth (ISO format). Must be 21+. Defaults to age 27 if not provided |
| `alias` | string | no | Character alias/nickname |
| `job` | string | no | Character occupation |
| `whereYouLive` | string | no | Location where character lives |
| `gender` | enum(Female \| Male) | yes | Character gender |
| `penisSize` | enum(Small \| Huge \| Enormous) | no | Penis size (male only) |
| `vaginaHair` | enum(Bald \| Designer \| Diamond shape \| French wax \| Full bush \| Heart shape \| Landing strip \| Lightning bolt \| Long \| Natural \| Neat triangle \| Partially shaved sides \| Shaved \| Small trimmed patch \| Smooth wax \| Thin landing strip \| Thin vertical strip \| Tiny Brazilian \| Trimmed \| Trimmed short \| V shaped \| Wild) | no | Pubic hair style (female only). Use GET /api/v1/characters/vagina-hair for valid values |
| `vaginaSize` | enum(Accommodating \| Average \| Extremely tight \| Gilf \| Gripping \| Incredibly tight \| Loose & wet \| Milf \| Normal \| Perfectly snug \| Petite tight \| Post-baby looser \| Relaxed \| Slightly looser \| Snug \| Super tight \| Tight \| Very Accommodating \| Very tight \| Well-used \| Youthfully tight) | no | Vagina size (female only). Use GET /api/v1/characters/vagina-sizes for valid values |
| `physicalCharacteristics` | string[] | no | Array of additional physical features not covered by other fields (e.g., glasses, freckles, pregnancy, piercings) |
| `orientation` | enum(90/10 \| Asexual \| Bi-curious \| Bicurious \| Bisexual \| Demisexual \| Experimenting \| Fluid \| Gay \| Heteroflexible \| Homoflexible \| Lesbian \| Mostly straight \| Open to anything \| Pansexual \| Queer \| Sapiosexual \| Straight \| Straight but plays with girls) | no | Character's sexual orientation. Affects who the character is attracted to in text conversations. |
| `personality` | string[] | no | Character's personality archetype. Shapes the character's overall behavior and tone in text conversations. |
| `interests` | string[] | no | Character interests. Values must match valid terms — use GET /api/v1/characters/interests for the full list. Auto-generated if missing |
| `kinks` | string[] | no | Character's sexual preferences and kinks. Used to shape the character's personality and behavior in text conversations only — they do not control image or video generation capabilities. |
| `hairLength` | string | no | Hair length. Use GET /api/v1/characters/hair-lengths for valid values |
| `hairColour` | string | no | Hair colour. Use GET /api/v1/characters/hair-colours for valid values |
| `eyeColour` | string | no | Eye colour. Use GET /api/v1/characters/eye-colours for valid values |
| `breastSize` | string | no | Breast size (female only). Use GET /api/v1/characters/breast-sizes for valid values. Auto-generated if missing |
| `bodyBuild` | string | no | Body build type. Use GET /api/v1/characters/body-builds for valid values |
| `backstory` | string | no | Character backstory. Auto-generated if missing |
| `textingStyle` | string | no | texting/communication style description. Auto-generated if missing |
| `tattoos` | string | no | tattoo description. Auto-generated if missing |
| `profileImageUrl` | string | no | URL to profile image (downloaded and saved automatically) |
| `coverVideoUrl` | string | no | URL to cover video (downloaded and saved automatically) |
| `voiceUrl` | string | no | HTTP URL to voice audio file (downloaded automatically) |
| `audioSpeed` | number | no | Audio playback speed multiplier _(default `0.5`)_ |
| `socialHandleInstagram` | string | no | Instagram handle |
| `socialHandleTiktok` | string | no | TikTok handle |
| `socialHandleTwitter` | string | no | X/Twitter handle |
| `height` | string | no | Character height |
| `bodyShape` | enum(Apple \| Athletic \| Balanced \| Bottom-heavy pear \| Busty rectangle \| Chubby \| Hourglass \| Inverted triangle \| Pear \| Petite hourglass \| Rectangle \| Slim hourglass \| Soft pear \| Thick hourglass \| Top-heavy \| Voluptuous hourglass) | no | Body shape. Use GET /api/v1/characters/body-shapes for valid values |
| `buttSize` | enum(Average \| Big \| Bubble Butt \| Firm & round \| Flat \| Heart-shaped \| Huge \| Jiggly \| Juicy \| Massive \| Peach \| Perky \| Phat \| Round & Full \| Shelf \| Small \| Thick \| Wide) | no | Butt size. Use GET /api/v1/characters/butt-sizes for valid values |
| `skinTone` | enum(Alabaster \| Beige \| Caramel \| Deep Brown \| Deep Tan \| Ebony \| Espresso \| Golden \| Golden Olive \| Honey \| Latte \| Light \| Light Caramel \| Light Olive \| Mahogany \| Medium Brown \| Mocha \| Olive \| Pale Ivory \| Rich Brown \| Sun-Kissed \| Tan \| Tawny \| Very Pale \| Warm Honey \| Warm Ivory) | no | Skin tone. Use GET /api/v1/characters/skin-tones for valid values |
| `breastPertness` | string | no | Breast pertness (female only). Use GET /api/v1/characters/breast-pertness for valid values |
| `nippleColour` | enum(Almost black \| Caramel brown \| Dark brown \| Dark pink \| Deep brown \| Dusky rose \| Light brown \| Light pink \| Mauve \| Medium brown \| Medium pink \| Peachy pink \| Pink \| Puffy dark pink \| Puffy light pink \| Reddish-pink \| Rosy brown \| Tan brown) | no | Nipple colour (female only). Use GET /api/v1/characters/nipple-colours for valid values |
| `relationshipStatus` | string | no | Relationship status |
| `imageModel` | string | no | Image model for generation _(default `flux`)_ |
| `contentLevel` | enum(Sexy \| Topless \| Nudes \| Sex) | no | Maximum content level the character will engage with. Determines what the character is willing to do in both text conversations and media generation. Sexy = suggestive/clothed, Topless = partial nudity, Nudes = full nudity, Sex = explicit sexual content. |
| `bodyType` | string | no | Body type (valid value from lookup endpoint) |
| `eyeColor` | string | no | Eye color (valid value from lookup endpoint) |
| `hairColor` | string | no | Hair color (valid value from lookup endpoint) |
| `socialHandleYoutube` | string | no | YouTube handle |
| `socialHandleTwitch` | string | no | Twitch handle |
| `socialHandleTelegram` | string | no | Telegram handle |
| `earlyAccessEmail` | integer | no | Early access email entity reference |
| `weight` | integer | no | Character weight/ordering _(default `200`)_ |
| `priorityPrice` | number | no | Priority subscription price (field_sub_a) _(default `9.99`)_ |
| `platinumPrice` | number | no | Platinum subscription price (field_sub_b) _(default `19.99`)_ |
| `vipPrice` | number | no | VIP subscription price (field_sub_c) _(default `39.99`)_ |
| `priorityListPrice` | number | no | Priority list price (field_list_price_a) _(default `19.99`)_ |
| `sexDrive` | enum(Always horny \| Asexual but enjoys pleasing \| Average \| High \| High but shy \| Hypersexual nympho \| Insatiable \| Low \| Low until aroused then wild \| Moderate \| Morning sex addict \| Needs it to fall asleep \| Night owl horny \| Once a day minimum \| Only horny when ovulating \| Permanently in heat \| Switches normal to crazy \| Touch-starved \| Very high \| Very low cuddly) | no | Character's sex drive level. Affects the character's eagerness and initiative in text conversations. |
| `conversationStyle` | enum(Baby-talk / little space \| Bratty & sassy \| Bubbly & giggly \| Constant compliments & praise \| Country / southern drawl \| Dirty talk queen \| Dominant & commanding \| Flirty & teasing \| Foul-mouthed & trashy \| High-maintenance princess \| Low-key & chill \| Nerdy & rambling \| Proper & polite \| Sarcastic & witty \| Shy & soft-spoken \| Submissive & obedient \| Sweet & innocent \| Tsundere \| Valley girl \| Weeb / anime speech) | no | Character's conversation style. Controls the tone and manner of the character's text responses. |
| `sexualExperience` | enum(100+ partners \| Almost virgin \| Always slutty \| Experienced \| Former escort \| Highly experienced \| Innocent but curious \| Lots of threesomes \| Moderate \| Mostly one-night stands \| Nymphomaniac \| Only relationships \| Porn-level \| Recently awakened \| Reformed good girl \| Sheltered then wild \| Swinger \| Very experienced \| Very limited \| Virgin) | no | Character's sexual experience level. Affects the character's personality and how they discuss sexual topics in text conversations. |
| `additionalDescription` | string | no | Free-text traits added to the reference image that the structured fields can't express. Examples: `nose piercing`, `hooped earrings`, `cherry blossom sleeve tattoo`, `wire-frame glasses`, `thin scar above the left eyebrow`. |

**202** — Character generation started. Poll status endpoint for completion.

**400** — Validation error - missing required fields, character under 21, or `additionalDescription` blocked by moderation (response body: `{"message": "Additional details blocked by moderation"}`).

**401** — Unauthorized - invalid or missing API key

### `POST /api/v2/characters/save`

Save AI Character

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `characterGuid` | string | yes | Character GUID from the generate step |
| `firstName` | string | no | Override first name |
| `lastName` | string | no | Override last name |
| `biography` | string | no | Override biography |
| `dateOfBirth` | string | no | Override date of birth (must be 21+) |
| `personality` | string[] | no | Override personality traits. Values must match valid terms — use GET /api/v1/characters/personalities for the full list |
| `interests` | string[] | no | Override interests. Values must match valid terms — use GET /api/v1/characters/interests for the full list |
| `kinks` | string[] | no | Character's sexual preferences and kinks. Used to shape the character's personality and behavior in text conversations only — they do not control image or video generation capabilities. |
| `backstory` | string | no | Override backstory |
| `tattoos` | string | no | Override tattoo description |
| `textingStyle` | string | no | Override texting/communication style |
| `physicalCharacteristics` | string[] | no | Override physical characteristics (array of strings) |
| `penisSize` | string | no | Override penis size (male only) |
| `breastSize` | string | no | Override breast size (female only) |
| `ethnicity` | string | no | Override ethnicity |
| `hairLength` | string | no | Override hair length |
| `voiceUrl` | string | no | HTTP URL to voice reference audio file (.wav). Overrides any voice set at generate time |
| `alias` | string | no | Override alias/nickname |
| `job` | string | no | Override job title |
| `whereYouLive` | string | no | Override location |
| `gender` | string | no | Override gender |
| `orientation` | string | no | Override sexual orientation |
| `relationshipStatus` | string | no | Override relationship status |
| `profileImageUrl` | string | no | URL to profile image (downloaded, cropped to 1:1, saved to S3) |
| `coverVideoUrl` | string | no | URL to cover video (downloaded and saved to S3) |
| `imageModel` | string | no | Image model for generation _(default `flux`)_ |
| `audioSpeed` | number | no | Audio playback speed multiplier _(default `0.5`)_ |
| `socialHandleInstagram` | string | no | Instagram handle |
| `socialHandleTiktok` | string | no | TikTok handle |
| `socialHandleTwitter` | string | no | X/Twitter handle |
| `socialHandleYoutube` | string | no | YouTube handle |
| `socialHandleTwitch` | string | no | Twitch handle |
| `socialHandleTelegram` | string | no | Telegram handle |
| `contentLevel` | enum(Sexy \| Topless \| Nudes \| Sex) | no | Maximum content level the character will engage with. Determines what the character is willing to do in both text conversations and media generation. Sexy = suggestive/clothed, Topless = partial nudity, Nudes = full nudity, Sex = explicit sexual content. |
| `bodyType` | string | no | Override body type (valid value from lookup endpoint) |
| `eyeColor` | string | no | Override eye color (valid value from lookup endpoint) |
| `hairColor` | string | no | Override hair color (valid value from lookup endpoint) |
| `earlyAccessEmail` | integer | no | Early access email entity reference |
| `weight` | integer | no | Character weight/ordering _(default `200`)_ |
| `uid` | integer | no | User ID in OhChat system |
| `priorityPrice` | number | no | Override priority subscription price (field_sub_a) _(default `9.99`)_ |
| `platinumPrice` | number | no | Override platinum subscription price (field_sub_b) _(default `19.99`)_ |
| `vipPrice` | number | no | Override vIP subscription price (field_sub_c) _(default `39.99`)_ |
| `priorityListPrice` | number | no | Override priority list price (field_list_price_a) _(default `19.99`)_ |
| `platinumListPrice` | number | no | Override platinum list price (field_list_price_b) _(default `29.99`)_ |

**202** — Character save started. Poll status endpoint for completion.

**400** — Validation error - missing characterGuid, character under 21, or already saved

**401** — Unauthorized - invalid or missing API key

**404** — Character not found

## Customer Library

### `GET /api/v1/characters/customer-characters`

Get characters for the authenticated customer

**200** — Customer characters returned successfully

```json
{
  "success": true,
  "characters": [
    {
      "cid": 8671,
      "firstName": "Rachel",
      "lastName": "Walton",
      "gender": "Female",
      "job": "Model",
      "image_url": "<signed-s3-url>"
    }
  ]
}
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/customer-library`

Get the authenticated customer's character library

**200** — Customer library returned successfully

```json
{
  "success": true,
  "characters": [
    {
      "cid": 8671,
      "firstName": "Rachel",
      "lastName": "Walton",
      "image_url": "<signed-s3-url>"
    }
  ],
  "digitalTwins": [
    {
      "id": "a47a1352-af8a-4e4a-9b2f-1e9a180ef984",
      "characterId": 9371,
      "name": "Lisa Stunner",
      "alias": "lisa",
      "status": "active",
      "profilePhotoUrl": "<signed-s3-url>"
    }
  ]
}
```

**401** — Unauthorized - invalid API key

### `GET /api/v1/digital-twins/customer-digital-twins`

Get digital twins for the authenticated customer

**200** — Customer digital twins returned successfully

```json
{
  "success": true,
  "digitalTwins": [
    {
      "id": "a47a1352-af8a-4e4a-9b2f-1e9a180ef984",
      "characterId": 9371,
      "name": "Lisa Stunner",
      "alias": "lisa",
      "status": "active",
      "profilePhotoUrl": "<signed-s3-url>"
    }
  ]
}
```

**401** — Unauthorized - invalid API key

## Digital Twins

### `POST /api/v1/digital-twins`

Create Digital Twin

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Character display name |
| `alias` | string | yes | Character nickname / short name |
| `dateOfBirth` | string | yes | Date of birth (ISO format). Character must be 21+ |
| `job` | string | yes | Character occupation |
| `location` | string | yes | Where the character lives |
| `gender` | enum(Female \| Male) | yes | Character gender |
| `orientation` | enum(90/10 \| Asexual \| Bi-curious \| Bicurious \| Bisexual \| Demisexual \| Experimenting \| Fluid \| Gay \| Heteroflexible \| Homoflexible \| Lesbian \| Mostly straight \| Open to anything \| Pansexual \| Queer \| Sapiosexual \| Straight \| Straight but plays with girls) | yes | Character's sexual orientation. Affects who the character is attracted to in text conversations. |
| `hairColour` | string | yes | Hair colour. Use GET /api/v1/characters/hair-colours for valid values |
| `eyeColour` | string | yes | Eye colour. Use GET /api/v1/characters/eye-colours for valid values |
| `bodyType` | string | yes | Body type. Use GET /api/v1/characters/body-builds for valid values |
| `referenceImageUrl` | string | yes | URL to reference image (downloaded and saved to S3) |
| `contentLevel` | enum(Sexy \| Topless \| Nudes \| Sex) | no | Maximum content level the character will engage with. Determines what the character is willing to do in both text conversations and media generation. Sexy = suggestive/clothed, Topless = partial nudity, Nudes = full nudity, Sex = explicit sexual content. |
| `profileImageUrl` | string | no | URL to profile image (converted to PNG and saved) |
| `bio` | string | no | Character biography |
| `textingStyle` | string | no | Texting/communication style |
| `ethnicity` | string | no | Character ethnicity. Use GET /api/v1/characters/ethnicities for valid values |
| `hairLength` | string | no | Hair length. Use GET /api/v1/characters/hair-lengths for valid values |
| `breastSize` | string | no | Breast size (female only). Use GET /api/v1/characters/breast-sizes for valid values |
| `tattoos` | string | no | Tattoo description |
| `physicalCharacteristics` | string[] | no | Physical characteristics (array of strings) |
| `personality` | string[] | no | Personality traits. Values must match valid terms — use GET /api/v1/characters/personalities for the full list |
| `interests` | string[] | no | Character interests. Values must match valid terms — use GET /api/v1/characters/interests for the full list |
| `kinks` | string[] | no | Character kinks. Values must match valid terms — use GET /api/v1/characters/kinks for the full list |
| `audioSpeed` | number | no | Audio playback speed multiplier _(default `1`)_ |
| `socialHandleInstagram` | string | no | Instagram handle |
| `vaginaHair` | string | no | Pubic hair style (female only). Use GET /api/v1/characters/vagina-hair for valid values |
| `relationshipStatus` | string | no | Relationship status |
| `backstory` | string | no | Character backstory. Auto-generated if not provided |
| `coverVideoUrl` | string | no | URL to cover video (downloaded and saved to S3) |
| `voiceUrl` | string | no | HTTP URL to voice reference audio file (.wav). For best results, ~30 seconds of clear speech |
| `socialHandleTiktok` | string | no | TikTok handle |
| `socialHandleTwitter` | string | no | X/Twitter handle |
| `socialHandleYoutube` | string | no | YouTube handle |
| `socialHandleTwitch` | string | no | Twitch handle |
| `socialHandleTelegram` | string | no | Telegram handle |
| `earlyAccessEmail` | integer | no | Early access email entity reference |
| `priorityPrice` | number | no | Priority subscription price (field_sub_a) _(default `9.99`)_ |
| `platinumPrice` | number | no | Platinum subscription price (field_sub_b) _(default `19.99`)_ |
| `vipPrice` | number | no | VIP subscription price (field_sub_c) _(default `39.99`)_ |
| `priorityListPrice` | number | no | Priority list price (field_list_price_a) _(default `19.99`)_ |
| `platinumListPrice` | number | no | Platinum list price (field_list_price_b) _(default `29.99`)_ |

**201** — Digital twin creation started. Poll status endpoint for completion.

**400** — Validation error - missing required fields or character under 21

**401** — Unauthorized - invalid or missing API key

**500** — Server error - image download failed or database error

### `PATCH /api/v1/digital-twins/{ohChatId}`

Update Digital Twin

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | no | Character display name |
| `alias` | string | no | Character nickname |
| `dateOfBirth` | string | no | Date of birth (must remain 21+) |
| `job` | string | no | Character occupation |
| `location` | string | no | Where the character lives |
| `bio` | string | no | Character biography |
| `textingStyle` | string | no | Texting style |
| `personality` | string[] | no | Update personality traits. Values must match valid terms — use GET /api/v1/characters/personalities for the full list |
| `interests` | string[] | no | Update interests. Values must match valid terms — use GET /api/v1/characters/interests for the full list |
| `profileImageUrl` | string | no | New profile image URL (downloaded and saved) |
| `gender` | enum(Female \| Male) | no | Character gender |
| `orientation` | enum(90/10 \| Asexual \| Bi-curious \| Bicurious \| Bisexual \| Demisexual \| Experimenting \| Fluid \| Gay \| Heteroflexible \| Homoflexible \| Lesbian \| Mostly straight \| Open to anything \| Pansexual \| Queer \| Sapiosexual \| Straight \| Straight but plays with girls) | no | Character's sexual orientation. Affects who the character is attracted to in text conversations. |
| `hairColour` | string | no | Update hair colour. Use GET /api/v1/characters/hair-colours for valid values |
| `eyeColour` | string | no | Update eye colour. Use GET /api/v1/characters/eye-colours for valid values |
| `bodyType` | string | no | Update body type. Use GET /api/v1/characters/body-builds for valid values |
| `ethnicity` | string | no | Update ethnicity. Use GET /api/v1/characters/ethnicities for valid values |
| `hairLength` | string | no | Update hair length. Use GET /api/v1/characters/hair-lengths for valid values |
| `breastSize` | string | no | Update breast size (female only). Use GET /api/v1/characters/breast-sizes for valid values |
| `vaginaHair` | string | no | Update pubic hair style (female only). Use GET /api/v1/characters/vagina-hair for valid values |
| `contentLevel` | enum(Sexy \| Topless \| Nudes \| Sex) | no | Maximum content level the character will engage with. Determines what the character is willing to do in both text conversations and media generation. Sexy = suggestive/clothed, Topless = partial nudity, Nudes = full nudity, Sex = explicit sexual content. |
| `tattoos` | string | no | Update tattoo description |
| `physicalCharacteristics` | string[] | no | Update physical characteristics (array of strings) |
| `kinks` | string[] | no | Update kinks. Values must match valid terms — use GET /api/v1/characters/kinks for the full list |
| `relationshipStatus` | string | no | Update relationship status |
| `backstory` | string | no | Update character backstory |
| `referenceImageUrl` | string | no | URL to new reference image |
| `coverVideoUrl` | string | no | URL to cover video |
| `voiceUrl` | string | no | HTTP URL to voice reference audio file (.wav) |
| `audioSpeed` | number | no | Audio playback speed multiplier |
| `socialHandleInstagram` | string | no | Instagram handle |
| `socialHandleTiktok` | string | no | TikTok handle |
| `socialHandleTwitter` | string | no | X/Twitter handle |
| `socialHandleYoutube` | string | no | YouTube handle |
| `socialHandleTwitch` | string | no | Twitch handle |
| `socialHandleTelegram` | string | no | Telegram handle |
| `earlyAccessEmail` | integer | no | Early access email entity reference |
| `priorityPrice` | number | no | Update priority subscription price (field_sub_a) _(default `9.99`)_ |
| `platinumPrice` | number | no | Update platinum subscription price (field_sub_b) _(default `19.99`)_ |
| `vipPrice` | number | no | Update vIP subscription price (field_sub_c) _(default `39.99`)_ |
| `priorityListPrice` | number | no | Update priority list price (field_list_price_a) _(default `19.99`)_ |
| `platinumListPrice` | number | no | Update platinum list price (field_list_price_b) _(default `29.99`)_ |

**200** — Digital twin updated successfully

**400** — Invalid data - age under 21 or invalid values

**401** — Unauthorized - invalid or missing API key

**404** — Digital twin not found

**500** — Server error - image download failed or database error

### `GET /api/v1/digital-twins/status/{digitalTwinId}`

Get Digital Twin Status

**200** — Digital twin status retrieved

**404** — Digital twin not found

## Images

### `POST /api/v1/images`

Generate Image (Async)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `character_id` | string | yes | Character identifier for generation |
| `prompt` | string | yes | Description of the image to generate |
| `prompt_enhancement` | boolean | no | When enabled, the system enhances your prompt using AI to improve image quality and detail. When disabled, your prompt is used as-is. _(default `false`)_ |
| `user_gender` | enum(male \| female) | no | Gender of the user. Used to tailor the generated scene when prompt enhancement is enabled. If omitted, defaults to the opposite of the character's gender. |
| `resolution` | integer[] \| enum(9:16 \| 16:9 \| 1:1 \| 4:3 \| 3:4) | no | Output resolution. Can be an aspect ratio string ("9:16", "16:9", "1:1", "4:3", "3:4") or an explicit [width, height] array. Aspect ratio presets map to: 9:16 → 720×1280, 16:9 → 1280×720, 1:1 → 1024×1024, 4:3 → 960×720, 3:4 → 720×960. |

**202** — Image generation job accepted

```json
{
  "message": "Image generation started",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing",
  "presigned_url": "https://s3.amazonaws.com/bucket/generated/image/154/2026-04/a1b2c3d4.png?X-Amz-..."
}
```

## Interactive Cam Avatars

### `POST /api/v1/cam/create`

Create Cam Avatar Session

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `character_uid` | string | yes | Unique identifier for the character |
| `webhook_url` | string | yes | Your REST endpoint URL to receive webhook events |

**201** — Cam session created successfully

```json
{
  "session_id": "cam_abc123xyz",
  "callback_url": "https://trulience.com/tglisten",
  "status": "active"
}
```

### `GET /api/v1/cam/sessions`

List Active Cam Sessions

**200** — List of active sessions

```json
{
  "sessions": [
    {
      "session_id": "cam_abc123xyz",
      "character_uid": "550e8400-e29b-41d4-a716-446655440000",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### `DELETE /api/v1/cam/sessions/{sessionId}`

End Cam Session

**200** — Session ended successfully

```json
{
  "message": "Session ended successfully",
  "session_id": "cam_abc123xyz"
}
```

## Jobs

### `GET /api/v1/jobs/{job_id}/status`

Check Job Status

**200** — Job status retrieved successfully

## Rooms

### `POST /api/v1/rooms`

Create Room

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `user_gender` | string | yes | Gender of the user (e.g., male, female) |
| `character_id` | string | yes | Unique identifier for the character/supermodel |
| `texting_style` | enum(default \| short-form \| long-form) | no | Optional reply register for this room. 'default' (used when omitted) keeps the existing production style; 'short-form' is a brief, punchy chat-speak register; 'long-form' is a warm, natural register. Can be changed later via PATCH /api/v1/rooms/{room_id}/texting-style. |

**201** — Room created successfully

```json
{
  "room_id": "your-room-id-here"
}
```

### `PUT /api/v1/rooms/{room_id}/texting-style`

Set Room Texting Style

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `texting_style` | enum(default \| short-form \| long-form) | yes | Reply register for the room. Applies from the next generated reply (text and audio). |

**200** — Room updated; returns the room view including the new texting_style

```json
{
  "room_id": "your-room-id-here",
  "texting_style": "long-form"
}
```

**400** — Invalid texting_style value

**404** — Room not found

### `PATCH /api/v1/rooms/{room_id}/texting-style`

Set Room Texting Style

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `texting_style` | enum(default \| short-form \| long-form) | yes | Reply register for the room. Applies from the next generated reply (text and audio). |

**200** — Room updated; returns the room view including the new texting_style

```json
{
  "room_id": "your-room-id-here",
  "texting_style": "long-form"
}
```

**400** — Invalid texting_style value

**404** — Room not found

## Taxonomy

### `GET /api/v1/terms/body_type`

Get Body Type Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Athletic",
    "tid": "45"
  },
  {
    "name": "Slim",
    "tid": "46"
  }
]
```

### `GET /api/v1/terms/breast_size`

Get Breast Size Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Small",
    "tid": "201"
  },
  {
    "name": "Medium",
    "tid": "202"
  }
]
```

### `GET /api/v1/terms/ethnicity`

Get Ethnicity Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Asian",
    "tid": "15"
  },
  {
    "name": "Caucasian",
    "tid": "16"
  }
]
```

### `GET /api/v1/terms/eye_color`

Get Eye Color Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Green",
    "tid": "233"
  },
  {
    "name": "Brown",
    "tid": "241"
  }
]
```

### `GET /api/v1/terms/gender`

Get Gender Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Female",
    "tid": "2"
  },
  {
    "name": "Male",
    "tid": "3"
  }
]
```

### `GET /api/v1/terms/hair_color`

Get Hair Color Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Blonde",
    "tid": "12"
  },
  {
    "name": "Brunette",
    "tid": "13"
  }
]
```

### `GET /api/v1/terms/interests`

Get Interests Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Art",
    "tid": "90"
  },
  {
    "name": "Music",
    "tid": "91"
  }
]
```

### `GET /api/v1/terms/kinks`

Get Kinks Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Preference 1",
    "tid": "301"
  },
  {
    "name": "Preference 2",
    "tid": "302"
  }
]
```

### `GET /api/v1/terms/orientation`

Get Orientation Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Straight",
    "tid": "4"
  },
  {
    "name": "Bisexual",
    "tid": "5"
  }
]
```

### `GET /api/v1/terms/personality`

Get Personality Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Adventurous",
    "tid": "120"
  },
  {
    "name": "Creative",
    "tid": "121"
  }
]
```

### `GET /api/v1/terms/traits`

Get Traits Terms

**200** — Terms retrieved successfully

```json
[
  {
    "name": "Confident",
    "tid": "401"
  },
  {
    "name": "Friendly",
    "tid": "402"
  }
]
```

## Text

### `POST /api/v1/text`

Generate Text

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `room_id` | string | yes | Room ID from the create room endpoint |
| `prompt` | string | yes | User's message or prompt |

**200** — Text generated successfully

```json
{
  "content": "Your generated text response will appear here"
}
```

## Videos

### `POST /api/v1/videos/create`

Generate Video (Async)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `prompt` | string | yes | Description of the video content or motion to generate. |
| `imageUrl` | string | no | **Image-to-Video mode.** URL of the source image to animate. Required for i2v mode. |
| `category` | enum(blowjob \| pov_blowjob \| cowgirl \| pov_cowgirl \| reverse_cowgirl \| pov_reverse_cowgirl \| pov_missionary \| doggy \| pov_doggy \| cunnilingus \| handjob \| pov_handjob \| foot_job \| pov_foot_job \| tit_job \| standing_up_sex_from_behind) | no | **Image-to-Video mode.** Motion/position category for the video. Determines what kind of motion is applied to the source image. Required for i2v mode. |
| `videoPath` | string | no | **Image-to-Video mode.** S3 storage path for the output video (e.g., `videos/{customerId}/{timestamp}-5s.mp4`). Required for i2v mode. |
| `videoLength` | enum(5 \| 10 \| 15) | no | **Image-to-Video mode.** Video length in seconds. Must be 5, 10, or 15. |
| `character_id` | string | no | **Text-to-Video mode.** Character identifier. The system generates a starting image from the character and animates it. |
| `image_url` | string | no | **Text-to-Video mode.** Alternative to character_id — provide your own source image. The system will animate it based on the prompt with automatic action detection. |
| `prompt_enhancement` | boolean | no | **Text-to-Video mode.** When enabled, the system enhances your prompt using AI to improve video quality and motion. Enabled by default. _(default `true`)_ |
| `resolution` | integer[] \| enum(9:16 \| 16:9 \| 1:1 \| 4:3 \| 3:4) | no | **Text-to-Video mode.** Output resolution. Can be an aspect ratio string or [width, height] array. Aspect ratio presets map to: 9:16 → 720×1800, 16:9 → 1280×720, 1:1 → 1024×1024, 4:3 → 960×720, 3:4 → 720×960. |
| `length` | enum(5 \| 10 \| 15) | no | **Text-to-Video mode.** Video length in seconds. Must be 5, 10, or 15. _(default `5`)_ |

**201** — Video generation job accepted (Image-to-Video mode)

```json
{
  "id": "abc123-def456",
  "status": "GENERATING"
}
```

**202** — Video generation job accepted (Text-to-Video mode)

```json
{
  "message": "Video generation started",
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "processing",
  "presigned_url": "https://s3.amazonaws.com/..."
}
```

**400** — Validation error or missing required fields

### `DELETE /api/v1/videos/delete`

Delete Video

**200** — Video deleted successfully

```json
{
  "ok": true,
  "status": "deleted"
}
```

**404** — Video not found

### `GET /api/v1/videos/get`

Check Video Status (Image-to-Video)

**200** — Video status retrieved

**404** — Video not found
