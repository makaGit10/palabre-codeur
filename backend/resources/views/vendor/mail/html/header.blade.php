@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
<span style="font-size:24px;font-weight:800;color:#0E6B4E;letter-spacing:-.02em;text-decoration:none">🌳 {!! $slot !!}</span>
</a>
</td>
</tr>
