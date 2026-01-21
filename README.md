Este un script para Adobe InDesign que ajusta automáticamente el tamaño del texto para que quepa perfectamente dentro de los marcos de texto seleccionados. El script puede tanto reducir texto que se desborda como ampliar texto que no llena completamente el marco, manteniendo todas las propiedades de formato y diseño.

Requisitos
Adobe InDesign CS6 o superior

Documento de InDesign abierto

Instalación
Guarda el archivo Texto a marco 2.jsx en la carpeta de scripts de InDesign:

Windows: C:\Program Files\Adobe\Adobe InDesign [Versión]\Scripts\Scripts Panel\

macOS: Aplicaciones/Adobe InDesign [Versión]/Scripts/Scripts Panel/

Reinicia InDesign si estaba abierto

El script aparecerá en el panel Scripts (Ventana > Utilidades > Scripts)

Cómo Usar
Ejecución Básica
Abre un documento de InDesign

Selecciona uno o más marcos de texto (opcional)

Ejecuta el script desde el panel Scripts

Configura las opciones en el cuadro de diálogo

Haz clic en "OK" para procesar

Opciones de Configuración
Alcance (Scope)
Solo marcos de texto seleccionados: Procesa únicamente los marcos seleccionados

Todos los marcos de texto del documento: Procesa todos los marcos de texto en el documento

Marcos con este estilo de objeto: Procesa marcos que tengan aplicado un estilo de objeto específico

Marcos con este estilo de párrafo: Procesa marcos que contengan texto con un estilo de párrafo específico

Marcos con este estilo de carácter: Procesa marcos que contengan texto con un estilo de carácter específico

Modo de Ajuste
Reducir o ampliar texto según sea necesario: Ajusta automáticamente reduciendo texto desbordado o ampliando texto que no llena el marco

Solo reducir texto, nunca ampliar: Solo reduce el tamaño del texto cuando se desborda

Solo ampliar texto, nunca reducir: Solo aumenta el tamaño del texto cuando no llena el marco

Opciones Adicionales
Ajustar solo el ancho: Cuando está marcado, solo ajusta el ancho del texto manteniendo la altura original

Características Técnicas
Propiedades Conservadas
El script mantiene todas las propiedades originales del texto y marco:

Estilos de carácter y párrafo

Transformaciones (rotación, inclinación)

Grosor de trazos

Márgenes internos (inset spacing)

Gutters de columna

Radios de esquina

Escalas horizontal y vertical

Algoritmo de Ajuste
El script utiliza un algoritmo de búsqueda binaria para encontrar el factor de escala óptimo que hace que el texto quepa perfectamente en el marco, garantizando precisión y rapidez.

Manejo de Historias Enlazadas
El script procesa correctamente historias de texto que fluyen a través de múltiples marcos enlazados, ajustando todos los marcos de la historia de manera coherente.

Casos de Uso Típicos
1. Ajuste de Textos Desbordados
Cuando tienes texto que no cabe en un marco y muestra el indicador de desbordamiento (+), el script reducirá proporcionalmente el texto hasta que quepa.

2. Ampliación de Textos Cortos
Para textos que ocupan solo una parte del marco, el script puede ampliarlos para un mejor uso del espacio.

3. Estandarización de Múltiples Marcos
Procesar varios marcos a la vez para tener consistencia en el ajuste de texto a lo largo de un documento.

4. Trabajo con Estilos
Ajustar solo los marcos que usan estilos específicos, útil para documentos con múltiples estilos de diseño.

Consejos de Uso
Antes de Ejecutar
Haz una copia de seguridad de tu documento

Agrupa elementos relacionados si necesitas mantener relaciones espaciales

Verifica que los marcos tengan las dimensiones finales deseadas

Para Mejores Resultados
El script funciona mejor con textos que usan estilos de párrafo y carácter

Para textos con rotación o transformaciones complejas, prueba primero con un marco

Usa la opción "Ajustar solo el ancho" para textos en columnas estrechas

Limitaciones y Consideraciones
No Compatible Con
Textos en trazados (paths)

Textos en tablas

Marcos con contenidos mixtos (texto e imágenes)

Consideraciones de Rendimiento
Documentos con cientos de marcos pueden tardar varios segundos

Se muestra una barra de progreso para procesamientos largos

El script desactiva temporalmente el redibujado de pantalla para mayor velocidad

Solución de Problemas
Error: "No hay documento abierto"
Asegúrate de tener un documento de InDesign abierto antes de ejecutar el script

Error: "No hay nada seleccionado"
Selecciona al menos un marco de texto o cambia el alcance a "Todos los marcos"

Error: "No se encontraron marcos de texto"
Verifica que existan marcos de texto en el documento

Si usas filtros por estilo, asegúrate que los estilos existan y se apliquen

El texto no se ajusta correctamente
Verifica que los marcos no tengan restricciones de escala

Comprueba que el texto no esté anclado a líneas de base

Asegúrate de que no haya objetos de anclaje interfiriendo

Recuperación de Errores
El script incluye manejo de excepciones y restaura:

Preferencias de redibujado

Preferencias de transformación

Todas las configuraciones originales en caso de error

Personalización
El script guarda las preferencias en etiquetas del documento, por lo que recordará tu última configuración al ejecutarlo nuevamente en el mismo documento.

Soporte
Para problemas o sugerencias:

Verifica que estés usando una versión compatible de InDesign

Intenta reproducir el problema en un documento nuevo

Desactiva otros scripts y complementos para verificar conflictos
