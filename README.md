<a name="readme-top"></a>

<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<a href="https://github.com/yanquisalexander/saltouruguay-web">
  <img width="56px" src="https://saltouruguayserver.com/images/logo_salto.webp" alt="Logo" />
</a>

## Web oficial de SaltoUruguayServer

SaltoUruguayServer es una comunidad en Twitch que ofrece entretenimiento, realizando streams de videojuegos, eventos especiales y charlas en vivo. Este proyecto es la web oficial de la comunidad, donde se publican noticias, eventos y se ofrece soporte técnico a los usuarios.\
[Reportar error](https://github.com/yanquisalexander/saltouruguay-web/issues) · [Sugerir algo](https://github.com/yanquisalexander/saltouruguay-web/issues)

</div>

<details>
<summary>Tabla de contenidos</summary>

- [Web oficial de SaltoUruguayServer](#web-oficial-de-saltouruguayserver)
- [Características principales](#características-principales)
  - [Capturas de pantalla](#capturas-de-pantalla)
- [Para empezar](#para-empezar)
  - [Prerequisitos](#prerequisitos)
  - [Instalación](#instalación)
- [Contribuir al proyecto](#contribuir-al-proyecto)
  - [Contribuir desde Stackblitz](#contribuir-desde-stackblitz)
- [🛠️ Stack](#️-stack)

</details>

## Características principales

- **Comunidad**: Conoce a los miembros de la comunidad y participa en eventos especiales.
- **Soporte técnico**: Encuentra soluciones a problemas comunes y reporta errores.
- **Noticias**: Entérate de las últimas novedades y anuncios de la comunidad.
- **Eventos**: Consulta el calendario de eventos y participa en ellos.

### Capturas de pantalla

![Captura de pantalla en ordenador](https://via.placeholder.com/800x400.png?text=Captura+de+pantalla+Desktop)
![Captura de pantalla en móvil](https://via.placeholder.com/400x800.png?text=Captura+de+pantalla+Móvil)

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Para empezar

### Prerequisitos

- NVM (recomendado para asegurar versión de Node) ver [documentación oficial](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
  nvm use
  # o
  nvm use <version>
```
Si quieres automatizar el proceso, puedes crear un script siguiendo la documentación oficial

<details> <summary>Pequeño script de automatización</summary>
En Linux/MacOS:

```sh
# .bashrc | .zshrc | cualquier archivo de configuración
cd() {
builtin cd "$@"
	if [[ -f .nvmrc ]]; then
		nvm use > /dev/null
		nvm use
	fi
}
```


En Windows:

```powershell
# $PROFILE
function Change-Node-Version {
	param($path)
	& Set-Location $path
	$pwd = pwd
	if ( Test-Path "$pwd\\.nvmrc" ) {
		$version = Get-Content .nvmrc
		nvm use $version
	}
}
New-Alias -Name cd -Value Change-Node-Version -Force -Option AllScope
```

</details>
PNPM (es nuestra recomendación por su eficiencia y rapidez)

```sh
npm install -g pnpm
```
o NPM

```sh
npm install npm@latest -g
```

### Instalación

1. Clona el repositorio

```sh
git clone https://github.com/yanquisalexander/saltouruguay-web.git
```

2. Instala los paquetes de NPM

```sh
pnpm install
```

3. Ejecuta el proyecto

```sh
pnpm run dev
```

4. Configuración opcional: Edita tu archivo .env.local para agregar configuraciones específicas del servidor.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Contribuir al proyecto

Las contribuciones son lo que hacen que la comunidad de código abierto sea un lugar increíble para aprender, inspirar y crear. ¡Cualquier contribución que hagas es **muy apreciada**!

Si tienes alguna sugerencia que podría mejorar el proyecto, por favor haz un fork del repositorio y crea una pull request. También puedes simplemente abrir un issue con la etiqueta "enhancement".


Aquí tienes una guía rápida:

1. Haz un [_fork_](https://github.com/yanquisalexander/saltouruguay-web/fork) del Proyecto
2. Clona tu [_fork_](https://github.com/yanquisalexander/saltouruguay-web/fork) (`git clone <URL del fork>`)
3. Añade el repositorio original como remoto (`git remote add upstream <URL del repositorio original>`)
4. Crea tu Rama de Funcionalidad (`git switch -c feature/CaracteristicaIncreible`)
5. Realiza tus Cambios (`git commit -m 'Add: alguna CaracterísticaIncreible'`)
6. Haz Push a la Rama (`git push origin feature/CaracteristicaIncreible`)
7. Abre una [_pull request_](https://github.com/yanquisalexander/saltouruguay-web/pulls)



<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## 🛠️ Stack

## 🛠️ Stack

- [![Astro][astro-badge]][astro-url] - The web framework for content-driven websites.
- [![Typescript][typescript-badge]][typescript-url] - JavaScript with syntax for types.
- [![Tailwind CSS][tailwind-badge]][tailwind-url] - A utility-first CSS framework for rapidly building custom designs.
- [![@midudev/tailwind-animations][animations-badge]][animations-url] - Easy peasy animations for your Tailwind project.



<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

[astro-url]: https://astro.build/
[typescript-url]: https://www.typescriptlang.org/
[tailwind-url]: https://tailwindcss.com/
[animations-url]: https://tailwindcss-animations.vercel.app/
[astro-badge]: https://img.shields.io/badge/Astro-fff?style=for-the-badge&logo=astro&logoColor=bd303a&color=352563
[typescript-badge]: https://img.shields.io/badge/Typescript-007ACC?style=for-the-badge&logo=typescript&logoColor=white&color=blue
[tailwind-badge]: https://img.shields.io/badge/Tailwind-ffffff?style=for-the-badge&logo=tailwindcss&logoColor=38bdf8
[animations-badge]: https://img.shields.io/badge/@midudev/tailwind-animations-ff69b4?style=for-the-badge&logo=node.js&logoColor=white&color=blue
[contributors-shield]: https://img.shields.io/github/contributors/yanquisalexander/saltouruguay-web.svg?style=for-the-badge
[contributors-url]: https://github.com/yanquisalexander/saltouruguay-web/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/yanquisalexander/saltouruguay-web.svg?style=for-the-badge
[forks-url]: https://github.com/yanquisalexander/saltouruguay-web/network/members
[stars-shield]: https://img.shields.io/github/stars/yanquisalexander/saltouruguay-web.svg?style=for-the-badge
[stars-url]: https://github.com/yanquisalexander/saltouruguay-web/stargazers
[issues-shield]: https://img.shields.io/github/issues/yanquisalexander/saltouruguay-web.svg?style=for-the-badge
[issues-url]: https://github.com/yanquisalexander/saltouruguay-web/issues