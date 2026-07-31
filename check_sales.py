import re
c = open('client/src/components/Sales.jsx', 'r').read()
div_opens = len(re.findall(r'<div[\s>]', c))
div_closes = len(re.findall(r'</div>', c))
td_opens = len(re.findall(r'<td[\s>]', c))
td_closes = len(re.findall(r'</td>', c))
tr_opens = len(re.findall(r'<tr[\s>]', c))
tr_closes = len(re.findall(r'</tr>', c))
print(f'<div>: {div_opens} opens, {div_closes} closes, match={div_opens == div_closes}')
print(f'<td>: {td_opens} opens, {td_closes} closes, match={td_opens == td_closes}')
print(f'<tr>: {tr_opens} opens, {tr_closes} closes, match={tr_opens == tr_closes}')
all_ok = div_opens == div_closes and td_opens == td_closes and tr_opens == tr_closes
print(f'ALL OK: {all_ok}')
if not all_ok:
    print(f'  Missing {div_opens - div_closes} div closes, {td_opens - td_closes} td closes, {tr_opens - tr_closes} tr closes')
