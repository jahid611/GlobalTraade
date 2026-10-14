# Petit atelier des icônes Globly. Chaque icône = des tracés sur une grille de 24.
#   b : corps (formes fermées ; pleines en version « fill »)
#   d : détails à l'intérieur du corps (évidés en version « fill »)
#   s : traits hors du corps (toujours en trait)
#   f : petites formes toujours pleines (étoile, point)
#   k : petite forme pleine posée sur le corps (évidée en version « fill »)
import math
ICONS={}; ALIAS={}
def n(v):
    s=f"{v:.2f}".rstrip('0').rstrip('.'); return '0' if s in('-0','') else s
def C(cx,cy,r): return f"M{n(cx-r)} {n(cy)}a{n(r)} {n(r)} 0 1 0 {n(2*r)} 0a{n(r)} {n(r)} 0 1 0 {n(-2*r)} 0Z"
def E(cx,cy,rx,ry): return f"M{n(cx-rx)} {n(cy)}a{n(rx)} {n(ry)} 0 1 0 {n(2*rx)} 0a{n(rx)} {n(ry)} 0 1 0 {n(-2*rx)} 0Z"
def R(x,y,w,h,r=0):
    if r==0: return f"M{n(x)} {n(y)}h{n(w)}v{n(h)}h{n(-w)}Z"
    return (f"M{n(x+r)} {n(y)}h{n(w-2*r)}a{n(r)} {n(r)} 0 0 1 {n(r)} {n(r)}v{n(h-2*r)}a{n(r)} {n(r)} 0 0 1 {n(-r)} {n(r)}"
            f"h{n(-(w-2*r))}a{n(r)} {n(r)} 0 0 1 {n(-r)} {n(-r)}v{n(-(h-2*r))}a{n(r)} {n(r)} 0 0 1 {n(r)} {n(-r)}Z")
def ST(x,y,r,k=0.13):
    return f"M{n(x)} {n(y-r)}Q{n(x+r*k)} {n(y-r*k)} {n(x+r)} {n(y)}Q{n(x+r*k)} {n(y+r*k)} {n(x)} {n(y+r)}Q{n(x-r*k)} {n(y+r*k)} {n(x-r)} {n(y)}Q{n(x-r*k)} {n(y-r*k)} {n(x)} {n(y-r)}Z"
def P(cx,cy,r,deg): 
    a=math.radians(deg); return cx+r*math.cos(a), cy+r*math.sin(a)
def pt(cx,cy,r,deg):
    x,y=P(cx,cy,r,deg); return f"{n(x)} {n(y)}"
def arc(cx,cy,r,a0,a1,move=True):
    """arc de cercle de a0 à a1 (degrés, sens horaire à l'écran si a1>a0)"""
    large=1 if abs(a1-a0)>180 else 0; sweep=1 if a1>a0 else 0
    return (f"M{pt(cx,cy,r,a0)}" if move else "")+f"A{n(r)} {n(r)} 0 {large} {sweep} {pt(cx,cy,r,a1)}"
def L(*p): return "M"+"L".join(f"{n(p[i])} {n(p[i+1])}" for i in range(0,len(p),2))
def icon(name,b=(),d=(),s=(),f=(),k=(),alias=()):
    g=lambda v:[v] if isinstance(v,str) else list(v)
    ICONS[name]={"b":g(b),"d":g(d),"s":g(s),"f":g(f),"k":g(k)}
    for a in alias: ALIAS[a]=name
def svg_inner(defn,fill=False,uid="m",color="#fff",sw=1.7):
    j=lambda arr:"".join(f'<path d="{p}"/>' for p in arr)
    if not fill or not defn["b"]:
        return (f'<g fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{j(defn["b"]+defn["d"]+defn["s"])}</g>'
                f'<g fill="{color}">{j(defn["f"]+defn["k"])}</g>')
    return (f'<mask id="{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><g fill="#fff" stroke="#fff" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{j(defn["b"])}</g>'
            f'<g fill="none" stroke="#000" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{j(defn["d"])}</g><g fill="#000">{j(defn["k"])}</g></mask>'
            f'<rect width="24" height="24" fill="{color}" mask="url(#{uid})"/>'
            f'<g fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{j(defn["s"])}</g><g fill="{color}">{j(defn["f"])}</g>')
def sheet(names,path,cols=6):
    import subprocess
    cw,ch=200,150; rows=(len(names)+cols-1)//cols; W=cols*cw; H=rows*ch+10; S=max(W,H)
    o=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{S}" height="{S}" viewBox="0 0 {S} {S}"><rect width="{S}" height="{S}" fill="#17161c"/>']
    for i,nm in enumerate(names):
        x=(i%cols)*cw; y=(i//cols)*ch; d=ICONS[nm]
        o.append(f'<text x="{x+10}" y="{y+18}" font-family="Helvetica" font-size="12" fill="#fff" fill-opacity=".8">{nm}</text>')
        o.append(f'<g transform="translate({x+8},{y+28}) scale(4)"><rect width="24" height="24" fill="#fff" fill-opacity=".05"/>{svg_inner(d)}</g>')
        o.append(f'<g transform="translate({x+112},{y+30}) scale(2)">{svg_inner(d,True,"m%d"%i)}</g>')
        o.append(f'<g transform="translate({x+112},{y+88})">{svg_inner(d)}</g><g transform="translate({x+146},{y+92}) scale(.6667)">{svg_inner(d)}</g><g transform="translate({x+170},{y+88})">{svg_inner(d,True,"n%d"%i)}</g>')
    o.append('</svg>'); open(path,'w').write("".join(o))
    subprocess.run(["qlmanage","-t","-s","2400","-o",".",path],capture_output=True)
    from PIL import Image
    im=Image.open(path+".png"); k=2400/S; im.crop((0,0,int(W*k),int(H*k))).save(path.replace('.svg','.png'))

import re as _re
def rot(path,deg=45,cx=12,cy=12):
    """tourne un tracé écrit en coordonnées absolues (M L C Q Z)"""
    a=math.radians(deg); co,si=math.cos(a),math.sin(a)
    def f(m):
        x,y=float(m.group(1)),float(m.group(2)); dx,dy=x-cx,y-cy
        return f"{n(cx+dx*co-dy*si)} {n(cy+dx*si+dy*co)}"
    return _re.sub(r'(-?\d+\.?\d*) (-?\d+\.?\d*)',f,path)
def poly(pts,close=True): return "M"+"L".join(f"{n(x)} {n(y)}" for x,y in pts)+("Z" if close else "")
