# 🌾 Sremeas Admin (ប្រព័ន្ធគ្រប់គ្រង ស្រែមាន)

ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យអតិថិជន វិក្កយបត្រ មុខទំនិញ និងរបាយការណ៍អាជីវកម្ម ស្រែមាន។  
បង្កើតឡើងដោយប្រើប្រាស់ **React 19**, **Vite**, **Tailwind CSS**, និង **Supabase**។

* 🌐 **គេហទំព័រ Online (Live App):** [https://sirkakratana-ops.github.io/sremeas-admin/](https://sirkakratana-ops.github.io/sremeas-admin/)
* 📦 **GitHub Repository:** [https://github.com/sirkakratana-ops/sremeas-admin](https://github.com/sirkakratana-ops/sremeas-admin)

---

## 📋 មាតិកា (Table of Contents)
1. [តម្រូវការជាមុន (Prerequisites)](#1-តម្រូវការជាមុន-prerequisites)
2. [ការដំឡើង និងដំណើរការ Local (Installation & Run Dev)](#2-ការដំឡើង-និងដំណើរការ-local-installation--run-dev)
3. [ការ Build សម្រាប់ Production (Build for Production)](#3-ការ-build-សម្រាប់-production-build-for-production)
4. [ការ Deploy ឡើងទៅ Online (Deploy to GitHub Pages)](#4-ការ-deploy-ឡើងទៅ-online-deploy-to-github-pages)
5. [ការ Push កូដប្រភពទៅកាន់ GitHub (Push Source Code to Master)](#5-ការ-push-កូដប្រភពទៅកាន់-github-push-source-code-to-master)
6. [ការកំណត់ GitHub Token / Authentication](#6-ការកំណត់-github-token--authentication)
7. [ការដោះស្រាយបញ្ហាទូទៅ (Troubleshooting)](#7-ការដោះស្រាយបញ្ហាទូទៅ-troubleshooting)

---

## 1. តម្រូវការជាមុន (Prerequisites)

* **Node.js** (កំណែ v18.0 ឬថ្មីជាងនេះ)
* **Git** (ដំឡើងនៅលើកុំព្យូទ័ររួចរាល់)

---

## 2. ការដំឡើង និងដំណើរការ Local (Installation & Run Dev)

បើក Terminal / PowerShell ក្នុងថត `d:\React\sremeas-admin` រួចវាយពាក្យបញ្ជា៖

```bash
# ១. ដំឡើង packages ទាំងអស់
npm install

# ២. ដំណើរការ Local Development Server
npm run dev
```

បន្ទាប់មកបើក Browser ចូលទៅកាន់តំណភ្ជាប់ក្នុង Terminal (ជាទូទៅគឺ `http://localhost:5173/sremeas-admin/`)។

---

## 3. ការ Build សម្រាប់ Production (Build for Production)

ដើម្បី Build កូដទាំងអស់ទៅជា Static Files (HTML/CSS/JS) ដាក់ក្នុងថត `dist/`៖

```bash
npm run build
```

*ចំណាំ៖ បើប្រព័ន្ធ PowerShell បង្ហាញ Error ថា Scripts Disabled សូមមើលចំណុចទី ៧ ឬប្រើពាក្យបញ្ជាខាងក្រោម៖*
```bash
node ./node_modules/vite/bin/vite.js build
```

ដើម្បីតេស្តមើល Output នៃ `dist/` លើម៉ាស៊ីនផ្ទាល់៖
```bash
npm run preview
```

---

## 4. ការ Deploy ឡើងទៅ Online (Deploy to GitHub Pages)

គម្រោងនេះប្រើប្រាស់កញ្ចប់ `gh-pages` ដើម្បី Publish ថត `dist/` ទៅកាន់ branch `gh-pages` ដោយស្វ័យប្រវត្តិ៖

```bash
# ពាក្យបញ្ជាពេញលេញ (Build រួច Deploy ភ្លាមៗ)
npm run deploy
```

ឬប្រសិនបើដំណើរការដោយផ្ទាល់តាម Node៖
```bash
node ./node_modules/vite/bin/vite.js build
node ./node_modules/gh-pages/bin/gh-pages.js -d dist
```

នៅពេលវាបង្ហាញពាក្យ **`Published`** សូមរង់ចាំប្រហែល ១-២ នាទីដើម្បីឱ្យ GitHub Pages Update រួចចូលទៅកាន់៖  
👉 **[https://sirkakratana-ops.github.io/sremeas-admin/](https://sirkakratana-ops.github.io/sremeas-admin/)**

---

## 5. ការ Push កូដប្រភពទៅកាន់ GitHub (Push Source Code to Master)

បន្ទាប់ពីកែប្រែកូដរួចរាល់ហើយ អ្នកត្រូវ Push កូដប្រភព (Source Code) ទៅកាន់ branch `master` ដើម្បីរក្សាទុក Version History៖

```bash
# ១. បន្ថែមឯកសារទាំងអស់ដែលបានកែប្រែ
git add .

# ២. ដាក់កំណត់សម្គាល់ (Commit Message)
git commit -m "ពន្យល់ពីអ្វីដែលបានកែប្រែ"

# ៣. Push ទៅកាន់ GitHub
git push origin master
```

---

## 6. ការកំណត់ GitHub Token / Authentication

ប្រសិនបើ Git ទាមទារ Password ឬបង្ហាញកំហុស `Permission denied` / `403 Forbidden` សូមប្រើ **Personal Access Token (Classic)** ដែលមានសិទ្ធិ `repo`៖

### ជំហានបង្កើត Token លើ GitHub៖
1. ចូលទៅ GitHub Account `sirkakratana-ops` -> [Settings > Personal Access Tokens (classic)](https://github.com/settings/tokens)
2. ចុច **Generate new token (classic)**
3. គូសធីកលើប្រអប់ **`repo`** (Full control of repositories)
4. ចុច **Generate token** រួច Copy លេខកូដ Token (`ghp_...`)

### ភ្ជាប់ Token ទៅកាន់ Git Remote៖
```bash
git remote set-url origin https://x-access-token:<YOUR_GITHUB_TOKEN>@github.com/sirkakratana-ops/sremeas-admin.git
```
*(ជំនួស `<YOUR_GITHUB_TOKEN>` ដោយ Token របស់អ្នក)*

---

## 7. ការដោះស្រាយបញ្ហាទូទៅ (Troubleshooting)

### បញ្ហាទី ១: PowerShell Execution Policy Error
**សញ្ញាកំហុស៖** `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled on this system.`  
**ដំណោះស្រាយ៖**  
បើក PowerShell ក្នុងសិទ្ធិ Administrator រួចវាយ៖
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
ឬអាចប្រើពាក្យបញ្ជាផ្ទាល់តាម Node.js ដោយមិនបាច់កែ Policy៖
* **Build:** `node ./node_modules/vite/bin/vite.js build`
* **Deploy:** `node ./node_modules/gh-pages/bin/gh-pages.js -d dist`

### បញ្ហាទី ២: ស្វែងរកអតិថិជនមិនឃើញដោយសារជាប់ Limit ១,០០០ របស់ Supabase
**ការពន្យល់៖**  
Supabase PostgREST មានកម្រិតកំណត់ Return ត្រឹមតែ ១,០០០ ជួរក្នុងមួយ Query។  
**ដំណោះស្រាយ៖**  
សូមប្រើប្រាស់អនុគមន៍ `fetchAllCustomers()` ដែលមានក្នុង `src/utils.js` ជំនួសឱ្យ `supabase.from('customers').select('*')` ធម្មតា ដើម្បីធានាថាទិន្នន័យអតិថិជនទាំងអស់ (១,០០០+) ត្រូវបានទាញយកមកពេញលេញ ១០០%។

---

© 2026 Sremeas Admin. All rights reserved.
