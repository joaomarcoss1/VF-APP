# Subir VF Nexus V4 para GitHub

Entre na pasta raiz extraída, onde existe a pasta `vf-app`, e rode:

```powershell
cd C:\Users\joaom\Downloads\vf-nexus-auditado-corrigido-funcional-v4

Remove-Item -Recurse -Force .\vf-app\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\vf-app\.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\vf-app\.git -ErrorAction SilentlyContinue
Remove-Item -Force .\vf-app\package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Force .\vf-app\tsconfig.tsbuildinfo -ErrorAction SilentlyContinue

git init
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/joaomarcoss1/VF-APP.git
git add vf-app
git commit -m "Corrige logo NexLabs e prepara VF Nexus V4"
git push -u origin main --force
```

Na Vercel, mantenha:

```text
Root Directory: vf-app
Build Command: npm run build
Install Command: npm install
Output Directory: .next
```
