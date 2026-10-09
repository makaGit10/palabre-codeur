<!doctype html>
<html lang="{{ app()->getLocale() }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>@yield('code') · Palabre</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 40px 20px;
    background: #0B1511; color: #E7EEEA; font-family: "DM Sans", "Segoe UI", system-ui, sans-serif;
    background-image: radial-gradient(60% 50% at 85% 10%, rgba(242,169,0,.2), transparent 70%), radial-gradient(55% 45% at 10% 95%, rgba(63,191,143,.25), transparent 70%);
  }
  main { max-width: 620px; text-align: center; }
  svg { width: 120px; height: 120px; }
  .code { margin: 26px 0 0; font: 600 15px/1 Consolas, Menlo, monospace; letter-spacing: .3em; color: #F2B731; }
  h1 { margin: 12px 0 0; font-family: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif; font-size: clamp(30px, 5vw, 46px); font-weight: 800; letter-spacing: -.02em; color: #fff; line-height: 1.1; }
  p.text { margin: 16px auto 0; max-width: 46ch; font-size: 16.5px; line-height: 1.6; color: rgba(231,238,234,.75); }
  a.btn { display: inline-block; margin-top: 28px; padding: 12px 22px; border-radius: 12px; background: #3FBF8F; color: #06140E; font-weight: 600; text-decoration: none; }
  a.btn:hover { filter: brightness(1.1); }
  .brand { margin-top: 40px; font-size: 13px; color: rgba(231,238,234,.5); }
</style>
</head>
<body>
<main>
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="#0E6B4E"/>
    <path d="M18 34c.5-5 .3-9-1-13M22 34c-.4-5 0-9 1.5-13M17 21c-3-1-5-3-6-5M23.5 21c3-1 5-3 6-5M20 21v-5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <ellipse cx="20" cy="13" rx="11" ry="5.5" fill="#F2A900"/>
  </svg>
  <p class="code">@yield('code')</p>
  <h1>@yield('title')</h1>
  <p class="text">@yield('message')</p>
  <a class="btn" href="{{ config('palabre.frontend_url') }}">@yield('action', __("Retour à l'accueil"))</a>
  <p class="brand">Palabre · {{ __("L'arbre à palabres des développeurs africains") }}</p>
</main>
</body>
</html>
