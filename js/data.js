// ==========================================
// TUS CORTOMETRAJES
// ==========================================
// Cada corto tiene su propia página: corto.html?id=<slug>
// - slug:      identificador único para la URL (minúsculas, sin espacios)
// - thumbnail: imagen HORIZONTAL para la tarjeta del inicio
// - poster:    póster VERTICAL para la ficha (si no hay, se usa el thumbnail)
// - trailer / movie: enlaces de YouTube (déjalos vacíos "" si no hay)
//
// PARA AÑADIR OTRO CORTO, copia un bloque desde '{' hasta '},' y cambia el slug.
const SHORTS = [
    {
        slug: "subidon",
        title: "SUBIDÓN",
        year: 2026,
        genre: "Suspense.",
        thumbnail: "img/subidon.png",
        poster: "img/subidonposter.png",
        trailer: "",
        movie: "https://youtu.be/ulkTQpwLgxQ",
        synopsis: "Un joven se aísla con la música de sus cascos, buscando escapar de su propia mente en una espiral de ritmo y paranoia.",
        laurels: []
    },
    {
        slug: "el-exito-te-mata",
        title: "EL EXITÓ TE MATA",
        year: 2026,
        genre: "Thriller psicológico.",
        thumbnail: "img/exitomata.png",
        poster: "img/elexitoposter.png",
        trailer: "",
        movie: "https://youtu.be/w6OSmCYD-lc",
        synopsis: "La ambición desmedida y la obsesión por la fama ciegan por completo a un aspirante a estrella, que fantasea constantemente con ser el centro de atención a cualquier precio. Sin embargo, ignora que la línea entre el éxito y la destrucción personal es muy fina, y la realidad acabará por golpearle de la forma más inesperada.",
        laurels: []
    },


    {
        slug: "ese-nombre-me-suena",
        title: "ESE NOMBRE ME SUENA",
        year: 2026,
        genre: "Thriller psicológico / Suspense.",
        thumbnail: "img/bate.png",
        poster: "img/bateposter.png",
        trailer: "https://youtu.be/0FjE0RmSkrs",
        movie: "https://youtu.be/Yc8U1BxB_e4",
        synopsis: "Dos amigos hablan por teléfono y uno de ellos, completamente borracho, suelta una confidencia sobre su pareja. Lo que empieza como una charla entre colegas deriva rápidamente en una espiral de tensión, paranoia y un final fatal.",
        laurels: []
    },
    
    {
        slug: "obsession-2",
        title: "Obsession 2",
        year: 2026,
        genre: "Terror psicológico",
        thumbnail: "img/OBSESSIONH.png",
        poster: "img/obsession-poster.jpg",
        trailer: "https://youtu.be/jwrhwtHvAKQ",
        movie: "",
        synopsis: "Vuelve el terror psicológico con la secuela de Obsession. Luis solo quería que Carmen no se fuera, pero al pedir un deseo prohibido, el amor se ha convertido en una pesadilla sangrienta de la que nadie sale vivo.",
        laurels: []
    },
    {
        slug: "looper",
        title: "LOOPER",
        year: null,
        genre: "Suspense",
        thumbnail: "img/LOOPERH.webp",
        poster: "img/looper-poster.jpg",
        trailer: "https://youtu.be/Oq3WvwN5hwg",
        movie: "https://youtu.be/aYMR9QImSBM",
        synopsis: "Atrapado en un bucle de tensión y silencio, un hombre con la boca sellada y las manos manchadas de sangre se enfrenta a una presencia enmascarada en una azotea desolada.",
        laurels: []
    },
    {
        slug: "sonoro",
        title: "SONORO parte 1 y parte 2",
        year: null,
        genre: "Terror",
        thumbnail: "img/SONOROH.png",
        poster: "img/sonoro-poster.jpg",
        trailer: "",
        movie: "https://youtu.be/i885vW4GWgA",
        synopsis: "Unos auriculares y un cable aparentemente inofensivos se convierten en la peor pesadilla de un joven en su propia casa.",
        laurels: [
            { type: "Finalista", name: "HorrorHound Festival" },
            { type: "Seleccionado", name: "Almamoura FilmFestival" }
        ]
    },
    {
        slug: "below",
        title: "BELOW",
        year: null,
        genre: "Terror",
        thumbnail: "img/BELOWH.png",
        poster: "img/below-poster.jpg",
        trailer: "https://youtu.be/fnF0reh733Y",
        movie: "https://youtu.be/Bx_djthAw_s",
        synopsis: "¿Qué se esconde justo debajo de tus pies cuando crees que estás a salvo en casa? Una atmósfera claustrofóbica, golpes secos en la oscuridad y una tensión insoportable.",
        laurels: []
    },
    {
        slug: "tengo-algo-que-decirte",
        title: "TENGO ALGO QUE DECIRTE",
        year: null,
        genre: "",
        thumbnail: "img/TENGO.png",
        poster: "img/obs.png", // Añade aquí su póster vertical cuando lo tengas (ej: "img/TENGOV.png")
        trailer: "https://youtu.be/Et5hKaKB6Fo",
        movie: "https://youtu.be/Pe1yrnFOLB4",
        synopsis: "Una tensa llamada nocturna entre una pareja por un supuesto control excesivo da un giro radicalmente aterrorizante cuando ella afirma estar esperándole en la sala de un cine que a medianoche debería estar cerrado, convirtiendo una discusión rutinaria en una pesadilla claustrofóbica.", // Escribe aquí la sinopsis de este corto
        laurels: []
    }
];

// ==========================================
// TUS GUIONES
// ==========================================
// PARA AÑADIR OTRO GUION, copia un bloque desde '{' hasta '},'.
const SCRIPTS = [
    {
        title: "El Último fotograma",
        poster: "img/portadaguion.jpg", // Sube esta imagen a la carpeta img/
        synopsis: "Guion cinematográfico de suspense sobre un proyeccionista.",
        laurels: [
            { type: "Seleccionado", name: "Concurso de Guion Corto 2026" }
        ]
    }
];
