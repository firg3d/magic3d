---
title: Instalar como aplicación, trabajar sin conexión y alojarlo tú mismo
summary: Abrir Magic3D como un programa normal, incluso sin red, y cómo hacerlo funcionar en tu propio ordenador.
---

## Instalar como aplicación

Magic3D se puede instalar como un programa normal. Así tiene su propio icono y su propia ventana, sin barra de direcciones. Después de la primera visita, se abre incluso **sin internet**. Tus diseños se quedan en tu ordenador. Merece la pena instalarlo: la aplicación arranca más rápido, porque no tiene que volver a cargarse cada vez, funciona sin internet y le ahorra trabajo al servidor. No pierdes nada, porque Magic3D te sigue avisando cuando sale una versión nueva. Eso también protege tus diseños: Safari en el Mac, el iPhone y el iPad borra los datos guardados de un sitio web que no se ha visitado en siete días, pero no los de una aplicación instalada.

Si tu navegador lo permite, en la página de inicio aparece un aviso con {{ui:installHint.install}}. Si no:

- **Chrome y Edge:** Haz clic en el icono de instalar que hay a la derecha de la barra de direcciones, o elige «Instalar como aplicación» en el menú del navegador.
- **Safari en el Mac:** Menú «Archivo» y luego «Añadir al Dock».
- **Safari en iPhone y iPad:** Icono de compartir y luego «Añadir a pantalla de inicio».
- **Firefox:** no puede instalar aplicaciones. Aun así, Magic3D se abre en él sin conexión, en una pestaña.

Puedes cerrar el aviso de la página de inicio con {{ui:installHint.dismiss}}. Si abres por segunda vez la aplicación instalada en Chrome o Edge, trae al frente la ventana que ya está abierta en lugar de abrir otra.

En un ordenador, un Magic3D instalado con Chrome o Edge se registra además como programa para los archivos `.lyl`: un doble clic en un diseño, en el explorador de archivos, lo abre en Magic3D, y [[Ctrl]]+[[S]] guarda en ese mismo archivo. En Android no funciona, porque allí el navegador no permite asociar tipos de archivo a las aplicaciones web instaladas; abre el diseño con {{ui:dashboard.importGeometry}} en la página de inicio.

## Actualizaciones

Cuando hay una versión más reciente, Magic3D lo indica en la página de inicio. En {{ui:dashboard.updateBannerLink}} puedes leer qué ha cambiado. El número de versión está abajo a la derecha. En cuanto recargas la página, tienes la versión nueva.

En magic3d.ro y en otros servidores web, una página abierta se da cuenta sola de que hay una actualización. Pregunta al servidor por su versión de vez en cuando, cuando vuelves a la pestaña y, en el acto, si ha desaparecido algún archivo del programa que necesita. Si entretanto se ha instalado algo nuevo, una tarjeta abajo a la derecha te lo dice y enumera las novedades. {{ui:newVersion.reload}} guarda primero en el navegador el diseño que tienes abierto y luego vuelve a cargar la página; el diseño vuelve tal como lo dejaste. {{ui:newVersion.later}} aparta la tarjeta durante 15 minutos. No tardes mucho en recargar: una página que se queda en la versión antigua puede cargar partes de la nueva que no encajan con ella. La misma tarjeta aparece cuando eso ya ha pasado: los procesos de CAD en segundo plano, que solo se cargan la primera vez que los necesitas, indican de qué compilación son y, si no es la de la página (después de una actualización o con una copia guardada de una versión antigua), la tarjeta te pide que recargues antes de que las dos partes dejen de entenderse.

Cuando Magic3D está abierto en varias pestañas, se vigilan unas a otras: si otra pestaña ya tiene una versión más reciente, un aviso en la parte de abajo de la pestaña antigua te pide que la recargues. Y si el mismo diseño está abierto en dos pestañas, las dos te avisan, porque guardan automáticamente y se sobrescribirían la una a la otra. Si abres Magic3D en otra pestaña cuando ya hay una abierta, la nueva te propone seguir en la antigua y se ofrece a cerrarse. Si quieres dos pestañas a propósito, por ejemplo para tener dos diseños uno al lado del otro, haz clic en {{ui:tabs.keepHere}} en esa pestaña nueva. Esta guía también se abre en una pestaña propia: mientras Magic3D está abierto al lado, su botón de arriba a la derecha dice «Volver al editor» y cierra la guía en lugar de abrir el editor por segunda vez.

## Idioma y aspecto

El idioma se elige arriba a la derecha, en la lista de idiomas. El tema, a su lado, ofrece {{ui:theme.short.system}} (sigue al sistema operativo), {{ui:theme.short.light}}, {{ui:theme.short.dark}} y {{ui:theme.short.graphite}}, un gris oscuro neutro.

## Alojarlo tú mismo

Magic3D es software libre (AGPL-3.0) y puedes hacerlo funcionar en tu propio ordenador o servidor, por ejemplo en un taller, una asociación o un colegio. Hay varias formas, que se describen en el [README de GitHub](https://github.com/firg3d/magic3d/blob/main/README.md):

- **Exportación estática:** El resultado son archivos normales que cualquier servidor web puede servir. Tienen que ir en la raíz de una dirección (`https://magic3d.example.com/` o `http://192.168.0.5:8080/`), no en una subcarpeta ni abiertos desde el disco; el README explica los pasos. Con una carpeta `store` con permiso de escritura junto a `index.html` y PHP en el servidor, se convierte además en el almacenamiento compartido de los diseños.

## Ayuda y comentarios

- En el editor, el grupo {{ui:editor.group.help}} contiene la {{ui:editor.guide}}, con los pasos más importantes, y el resumen de los [atajos de teclado](chapter:shortcuts). Cada apartado de la guía rápida tiene un signo de interrogación que lleva al capítulo correspondiente de esta guía.

![La guía rápida en el editor. Arriba aparecen vídeos hechos por otras personas, y cada apartado tiene un signo de interrogación.](shot:quick-guide)

- Lo que ha cambiado en cada versión está en las notas de la versión, que encontrarás en la parte de abajo de la página de inicio y del editor.
