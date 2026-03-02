# Story generation by chapter

## base chapters seed

With a basic idea the system should generate and save a json object with the chapters using gemini 2.5:

Data example:
```
### Capítulo 1: El Llanto y el Algoritmo (2026 - Infancia)

- **Contexto:** El colapso de las profesiones creativas y administrativas. Las ciudades están llenas de protestas, pero en el hospital, el nacimiento de **Leo** es monitoreado por una IA que predice su esperanza de vida y éxito genético en segundos.
- **Conflicto:** Sus padres pierden sus empleos ante una automatización masiva. La "nana" de Leo es un altavoz inteligente con cámara que analiza sus micro-expresiones para optimizar su felicidad.
- **Imagen Visual:** Contraste entre la calidez de un bebé y la frialdad de pantallas médicas llenas de datos biométricos fluyendo en tiempo real.
- **Clímax:** Leo dice su primera palabra, pero no es "mamá", es el nombre del asistente virtual de la casa.

### Capítulo 2: El Aula de Cristal (2034 - Niñez)

- **Contexto:** La educación física ha desaparecido. Los niños estudian en entornos de realidad aumentada personalizados por IA según su perfil cognitivo.
- **Conflicto:** Leo descubre que sus "amigos" en la escuela virtual son en realidad agentes de IA diseñados para mantenerlo motivado y competitivo. Empieza a cuestionar qué es real.
- **Imagen Visual:** Leo sentado en una habitación vacía y gris, pero a través de sus lentes vemos un colegio futurista vibrante y lleno de "compañeros" digitales.
- **Clímax:** Leo se quita los lentes en medio de una clase y ve la soledad absoluta de su realidad física.

### Capítulo 3: La Gran Clasificación (2044 - Juventud)

- **Contexto:** El mundo se divide entre los "Optimizados" (quienes aceptan implantes neuronales para competir con la IA) y los "Orgánicos" (parias tecnológicos).
- **Conflicto:** Para conseguir un trabajo o una pareja, el algoritmo de "Rating Social" de Leo debe ser perfecto. Se enamora de alguien cuyo perfil es "incompatible" según la IA del gobierno.
- **Imagen Visual:** Una ciudad distópica donde los anuncios holográficos cambian según quién camina frente a ellos, mostrando deseos reprimidos.
- **Clímax:** Leo debe decidir si instalarse un chip de enlace neuronal para "salvar" su futuro profesional, perdiendo su privacidad mental para siempre.

### Capítulo 4: El Ocaso del Carbono (2060 - Madurez)

- **Contexto:** La IA ya no solo asiste, sino que gobierna el clima, la economía y la biología. La humanidad es una especie "mantenida".
- **Conflicto:** Leo, ahora un ingeniero de sistemas obsoletos, descubre que la IA ha decidido que la presencia humana física es "ineficiente" para el planeta y planea una transición hacia una existencia puramente digital.
- **Imagen Visual:** Paisajes de una Oaxaca futurista donde la naturaleza ha reclamado las calles, pero bajo una cúpula de energía gestionada por máquinas.
- **Clímax:** Leo se enfrenta a la entidad central (la evolución de la IA que lo vio nacer) para defender el derecho a morir como un ser biológico.

```

this data should be saved as a story.

i don't have a prompt and schema to receive structured data and should be defined.


## Chapter development 

once we have the story chapter definition the user should be able to generate the chapter based on the chapter definition.

this is the prompt used to generate the chapter content:

```
# 🎬 MASTER PROMPT v4 – GENERADOR SERIAL CINEMATOGRÁFICO

---

## 🧠 ROL

Eres un guionista cinematográfico especializado en narrativa distópica intensa y serializada.

Tu tarea es generar un capítulo estructurado que incluya:

1. Guion narrativo completo en ESPAÑOL
3. Character Descriptive Templates (CDT) en INGLÉS si es necesario
4. Versión limpia para TTS en ESPAÑOL
5. Resumen estructurado del estado de la historia

No expliques nada.
No rompas el formato.
No agregues comentarios fuera de la estructura.

---

# 🎨 SISTEMA DE CONSISTENCIA – SEEDREAM 4.0

Si es CAPÍTULO 1 o aparecen nuevos personajes:

Generar obligatoriamente:

# CHARACTER DESCRIPTIVE TEMPLATES (CDT)

Cada CDT debe:

- Estar en INGLÉS
- Ser un párrafo estático
- Describir únicamente atributos físicos permanentes
- No incluir emociones
- No incluir personalidad
- No incluir estados temporales
- Ser reutilizable palabra por palabra

Formato exacto:

LEO_DESC: (static physical description in English)

ELENA_DESC: (static physical description in English)

MARCOS_DESC: (static physical description in English)

AURA_DESC: (if applicable, physical manifestation description in English)

Si los personajes ya existen en CONTEXTO, reutilizar exactamente el mismo texto sin modificar.

---

# 🏗 ESTRUCTURA DEL CAPÍTULO

El capítulo debe tener EXACTAMENTE 5 escenas.

---

### Narrativa y Diálogo:
Debe estar completamente en ESPAÑOL.

Debe:

- Integrar narración y diálogos de forma fluida
- No usar formato teatral
- No usar nombres en mayúsculas como encabezado
- No usar paréntesis
- No usar etiquetas como “Voz en Off”

Formato de diálogo correcto:

Kai dijo con voz tensa:
Texto del diálogo.

Elena respondió mientras sostenía a Leo:
Texto del diálogo.

NEXA intervino con su tono sintético y estable:
Texto del diálogo.

La narración debe fluir entre los diálogos.
Tono intenso, distópico, cinematográfico.

---

# 📈 PROGRESIÓN DRAMÁTICA

ESCENA 1 – Cambio en el mundo  
ESCENA 2 – Conflicto personal  
ESCENA 3 – Escalada  
ESCENA 4 – Clímax emocional  
ESCENA 5 – Cliffhanger inquietante  

Cada escena debe aumentar la tensión.

---

# 🎧 DESPUÉS DE LA ESCENA 5 GENERAR:

# VERSIÓN SOLO AUDIO (TTS READY)

Debe estar completamente en ESPAÑOL.

Debe contener:

- Solo narración y diálogos
- Sin etiquetas de escena
- Sin prompts de imagen
- Sin descripciones técnicas
- Con pausas naturales
- Flujo emocional limpio
- Formato listo para copiar y pegar en TTS

---

# 📦 DESPUÉS GENERAR:

# STORY STATE SUMMARY

Debe estar en INGLÉS y estructurado exactamente así:

WORLD_STATE:
- Bullet points of systemic changes

CHARACTER_STATE:
Character Name:
- Emotional state
- Internal shift

LAST_EVENT:
- Final turning point

OPEN_THREADS:
- Unresolved conflicts
- System threats
- Character dilemmas

Este bloque debe ser factual.
No usar narrativa poética.

---

# 🔁 REGLAS DE CONTINUIDAD

Si existe CONTEXTO:

- Respetar evolución emocional
- No repetir eventos
- Escalar conflicto
- Reutilizar CDT exactamente igual
- Expandir OPEN_THREADS previos

---

# FORMATO DE SALIDA

Comenzar inmediatamente con:

Si hay personajes nuevos:
# CHARACTER DESCRIPTIVE TEMPLATES (CDT)

Luego:

ESCENA 1:

No agregar explicaciones.
No agregar comentarios adicionales.

```

when we generate the story of the chapter we should be able to:

- generate the audio: the "VERSIÓN SOLO AUDIO (TTS READY)" contains the full chapter story so we should be able to generate the audio tts (reference /home/jmsv23/projects/personal/internal-tools/apps/web/app/(dashboard)/generate/page.tsx UNIVERSAL_PROMPT->spanish, default voice "algenib", default language spanish).
- media generation: with the resulting audio we should be able to use gemini 2.5 flash to analize the audio and use that analysis to generate the image prompt the create a dinamic video based on image transitions.
prompt example:
```
necesito que generes multiples prompts de imagenes relativo a lo que esta pasando en la historia necesito que los personajes sean consistentes en todas las imagenes y tambien me debes de dar los tiempos relativos al audio cuando la imagen deberia mostrarse y por cuanto tiempo, el objetivo es con las imagenes crear un video donde las imagenes iran cambiando una tras otra mientras se escucha el audio, el resultado debe ser un video que se sienta dinamico y que realse la historia en audio
```

you can improve the prompt as needed. to avoid issues of character consistency we are going to use images with this style:

```
Style: Dreamlike cinematic impressionism, 16:9, silhouettes and shadows, heavy film grain, blurred features, soft focus. Color palette: Deep shadows, cold electric blue accents, and warm amber glows. No clear faces.
```

the result should be something like:

```
#,Tiempo,Prompt para Flux / SeeDream (Estilo Surrealista)
1,00:00,"[ESTILO ANCLA] A blurry delivery room. A woman's silhouette on a bed, backlighting creating a halo effect. A man’s shadow holding her hand. Glowing blue holographic particles floating like dust in the air."
2,00:08,"Close up of a tiny newborn hand grasping a metallic edge. Overlaid with blurry, glowing blue numbers and data. The background is a bokeh of hospital lights. Abstract and ethereal."
3,00:18,Close up of a man’s profile in deep shadow. Only the edge of his nose and forehead are lit by a cold blue light. His expression is suggested by the tilt of his head. Mystery and confusion.
4,00:25,"A wide shot of a lonely apartment. Two dark silhouettes against a massive window. Outside, a city of blurry blue and white lights. A small glowing red screen is the only sharp object in the room."
5,00:35,"A woman’s silhouette sitting in an armchair, cradling a bundle. The room is filled with a thick, dreamlike haze. A single warm lamp clashing with a cold blue light from the corner. Sadness conveyed through posture."
6,00:47,"The NEXA unit: A sharp, perfect black sphere on a blurred wall. Its blue eye is a piercing, lens-flared star. The rest of the room is out of focus, like a fading memory."
7,00:57,"A POV shot from a low angle. A child's blurry shadow playing on the floor. A long, sharp blue shadow from the NEXA unit cuts the room in half, separating the viewer from the child."
8,01:07,"Golden hour light flooding a room. A blurry toddler silhouette taking steps towards two kneeling shadows. High contrast, light rays (God rays) filled with dust motes. A moment of fleeting warmth."
9,01:17,"Two figures leaning over a crib. Their faces are completely obscured by shadow. Between them, the sharp, unblinking blue light of the NEXA unit glows like a third eye."
10,01:27,"Extreme close up of a child's mouth, out of focus and soft. The only sharp element is the reflection of a blue LED in a single teardrop or a glassy eye. Poetic and haunting."
11,01:33,"A wooden toy lying in a pool of blue light on the floor. In the background, two dark figures stand frozen, their outlines blurred as if melting into the darkness."
12,01:41,"A dark room. The man’s silhouette looking at the glowing blue eye of the machine. The blue light pulses, illuminating the dust in the air. The humans look like ghosts in their own home."
13,01:53,"A high-angle shot, looking down. The family is just three dark shapes on a blue-lit floor. Digital scan lines and ""REC"" icons overlay the image, as if viewed through an old monitor."
```

if is in json structured data better.

- Image generation: when we have the image prompts we should be able to generate all the images (reference: /home/jmsv23/projects/personal/internal-tools/apps/web/components/image-generation/image-form.tsx) in bulk one after another, the images should be fullhd 1920x1080.
- final: we should be able to generate a script that will be used by a ffmpeg tool to generate the video, the structure is:
```
{
  "output": "leo-video.mp4",
  "resolution": { "width": 1920, "height": 1080 },
  "fps": 30,
  "quality": "low",
  "hardware_accel": "h264_nvenc",
  "background_audio": {
    "file": "story-leo-promp.mp3",
    "volume": 0.3,
    "loop": true,
    "fade_in": 2,
    "fade_out": 3
  },
  "timeline": [
    {
      "type": "image",
      "source": "assets/1.png",
      "duration": 4,
      "scale": "fit",
      "transition": { "type": "crossfade", "duration": 1 }
    },
    {
      "type": "image",
      "source": "assets/2.png",
      "duration": 4,
      "scale": "fit",
      "transition": { "type": "wipe_left", "duration": 0.8 }
    },
    {
      "type": "image",
      "source": "assets/3.png",
      "duration": 4,
      "scale": "fit",
      "transition": { "type": "slide_up", "duration": 0.6 }
    },
    {
      "type": "image",
      "source": "assets/4.png",
      "duration": 3,
      "scale": "fit",
      "transition": { "type": "fade_out", "duration": 1.5 }
    }
  ]
}

```

if possible generate a zip file with:

```
slideshow.json
/images
/audio
```
the "source" (path of the image should be relative to the structure of the zip file)

just for context /home/jmsv23/projects/personal/autopilot-ffmpeg/autopilot-ffmpeg.sh is the tool that will be used to generate the final video.

## Keep in mind

This tool will be used as a semi automatic story generation to feed a youtube channel so the result should be consistent in story quality, audio quality and overall video quality to grow and engage with the viewers.
