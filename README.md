# 🎯 سیستم دیسپچری بی‌سیم | Walkie-Talkie Dispatcher System

## 📱 توصیف پروژه

سامانه دیسپچری بی‌سیم آنلاین با قابلیت‌های:
- ✅ **صدای زنده** (PTT - Push To Talk)
- ✅ **نظارت تصویری و صوتی**
- ✅ **موقعیت‌یابی GPS (نقشه)**
- ✅ **مدیریت کاربران و کانال‌ها**
- ✅ **ثبت گزارش‌های سیستمی**

---

## 🚀 نحوه نصب و راه‌اندازی

### الزامات
- Node.js 16+ 
- npm یا yarn

### مراحل نصب

#### 1️⃣ Clone یا دانلود پروژه
```bash
git clone https://github.com/fava1366/fava1366.git
cd fava1366
```

#### 2️⃣ نصب وابستگی‌ها
```bash
npm install
# یا
yarn install
```

#### 3️⃣ اجرا در حالت توسعه
```bash
npm run dev
# یا
yarn dev
```

صفحه برنامه در `http://localhost:5173` باز می‌شود

#### 4️⃣ ساخت نسخه Production
```bash
npm run build
# یا
yarn build
```

---

## 🔑 مشخصات ورود

### ورود مدیر (Admin)
```
شناسه کاربری: admin
گذرواژه:      admin
```

---

## 📁 ساختار پروژه

```
📦 fava1366/
├── 📄 package.json              # وابستگی‌ها
├── 📄 tsconfig.json             # تنظیمات TypeScript
├── 📄 vite.config.ts            # تنظیمات Vite
├── 📄 tailwind.config.js        # تنظیمات Tailwind CSS
├── 📄 postcss.config.js         # تنظیمات PostCSS
├── 📄 index.html                # صفحه اصلی HTML
├── 📄 .gitignore                # فایل‌های نادیده‌گرفته شده
│
├── 📁 src/
│   ├── 📄 main.tsx              # نقطه ورود React
│   ├── 📄 App.tsx               # کامپوننت اصلی (WITH AUDIO FIX ✅)
│   ├── 📄 index.css             # استایل‌های گلوبال
│   ├── 📄 types.ts              # تعریف‌های TypeScript
│   │
│   └── 📁 components/
│       ├── 📄 PhoneSimulator.tsx    # شبیه‌ساز گوشی
│       ├── 📄 MapComponent.tsx      # نقشه موقعیت‌یابی
│       └── 📄 StreamRecorder.tsx    # نظارت صدا و تصویر
│
├── 📄 README.md                 # این فایل
└── 📄 AUDIO_FIX_GUIDE_DETAILED.md  # راهنمای رفع مشکل صدا
```

---

## ✨ ویژگی‌های اصلاح‌شده

### 🔊 مشکل صدا (FIXED ✅)

**مشکل قبلی:**
- موقع دریافت شاسی (PTT Audio)، صدا پخش نمی‌شد

**حل‌های اعمال شده:**

#### 1. بهبود `playBase64Audio()`
```javascript
// ✅ Parse Base64 بهتر
let base64Data = base64;
if (base64.includes(",")) {
  base64Data = base64.split(",")[1];
}
```

#### 2. بهبود Error Handling
```javascript
// ✅ Try-catch محکم‌تر در تمام Callbacks
ctx.decodeAudioData(
  arrayBuffer,
  (buffer) => {
    try {
      // کد موفق
    } catch (e) {
      fallbackPlayAudio(base64);
    }
  }
);
```

#### 3. بهبود Fallback Audio
```javascript
// ✅ اضافه‌ شدن crossOrigin
const audio = new Audio(base64);
audio.crossOrigin = "anonymous";
```

#### 4. بهبود WebSocket Handler
```javascript
// ✅ بررسی data.audioBase64 قبل پخش
if (soundEnabled && data.audioBase64) {
  playBase64Audio(data.audioBase64);
}
```

---

## 🎮 نحوه استفاده

### 👤 کاربر عادی (Phone Simulator)

1. **انتخاب کاربر و کانال**
   - از dropdown کاربری انتخاب کنید
   - کانال مورد نظر را تغیر دهید

2. **استفاده از PTT (دکمه صدا)**
   - دکمه "فشار دهید برای صحبت" را نگاه دارید
   - صدای PTT پخش می‌شود
   - دکمه را رها کنید تا تمام شود

3. **ارسال پیام متنی**
   - متن را تایپ کنید
   - Enter یا دکمه Send را بزنید

### 👨‍💼 مدیر (Admin Panel)

1. **ورود به پنل مدیریت**
   ```
   شناسه: admin
   رمز:   admin
   ```

2. **مدیریت کاربران**
   - کاربر را انتخاب کنید
   - وضعیت را تغیر دهید (فعال/مسدود)
   - کانال را تغیر دهید

3. **مدیریت کانال‌ها**
   - کانال جدید اضافه کنید
   - کاربران فعال را مشاهده کنید

4. **نظارت و گزارشات**
   - نقشه موقعیت را مشاهده کنید
   - صدا و تصویر را نظارت کنید
   - گزارشات سیستمی را ببینید

---

## 🧪 تست کردن صدا

### تست صدای PTT

```
1. صفحه را باز کنید
2. دکمه Speaker (بالا سمت راست) بررسی کنید - باید سبز باشد
3. یک کاربر انتخاب کنید
4. دکمه "فشار دهید برای صحبت" را فشار دهید
5. صدای Chirp (بوق) باید شنیده شود
```

### اگر صدا پخش نمی‌شود

```
1. F12 را فشار دهید (Developer Tools)
2. تب Console را انتخاب کنید
3. دنبال Error بگردید
4. تنظیمات صدای کامپیوتر را بررسی کنید
5. درخواست مجوز Microphone را قبول کنید
```

---

## 📊 فناوری‌های استفاده شده

| فناوری | نسخه | استفاده |
|--------|------|--------|
| React | 18.2.0 | UI Framework |
| TypeScript | 5.2.2 | Type Safety |
| Vite | 5.0.8 | Build Tool |
| Tailwind CSS | 3.3.6 | Styling |
| Web Audio API | Native | صدای PTT |
| WebSocket | Native | Real-time Communication |
| Lucide React | 0.408.0 | Icons |

---

## 🎨 Interface Components

### 📱 Phone Simulator
- انتخاب کاربر و کانال
- دکمه PTT
- فرستادن پیام متنی
- نمایش وضعیت دستگاه

### 🗺️ Map Component
- نمایش موقعیت کاربران
- محاسبه فاصله
- انتخاب کاربر از نقشه

### 📹 Stream Recorder
- فعال‌سازی دوربین
- فعال‌سازی میکروفن
- نمایش وضعیت جریان

### 👥 User Management
- لیست کاربران
- ایجاد کاربر جدید
- ویرایش اطلاعات کاربر
- قفل/آزادسازی کاربر

### 📻 Channel Management
- لیست کانال‌ها
- ایجاد کانال جدید
- نمایش تعداد کاربران فعال

### 📋 Logs & Reports
- ثبت تمام رویدادها
- فیلتر بر اساس نوع
- زمان‌بندی رویدادها

---

## 🔒 امنیت

- ✅ حداقل Validation برای ورود
- ✅ WebSocket Secure (WSS) در Production
- ✅ CORS Headers
- ✅ User Lock/Unlock System

---

## 🐛 حل مشکلات رایج

### 1. صدا پخش نمی‌شود
```javascript
✅ حل: بررسی کنید که دکمه Speaker بالا سمت راست سبز است
✅ حل: Volume کامپیوتر را بالا بگذارید
✅ حل: F12 کنید و Console را بررسی کنید
```

### 2. WebSocket متصل نمی‌شود
```javascript
✅ حل: صفحه را Reload کنید
✅ حل: بررسی کنید که Backend فعال است
✅ حل: Firewall را بررسی کنید
```

### 3. کاربر متصل نمی‌شود
```javascript
✅ حل: شناسه و رمز را بررسی کنید
✅ حل: صفحه را Hard Refresh کنید (Ctrl+Shift+R)
✅ حل: Cache را Clear کنید
```

---

## 📞 پشتیبانی

اگر مشکلی پیدا شد:

1. **F12 را فشار دهید**
2. **Console Errors را کپی کنید**
3. **Network Tab را بررسی کنید**
4. **Issue را باز کنید** در GitHub

---

## 📝 License

This project is provided as-is for educational purposes.

---

## ✅ نکات مهم

- ✅ **صدای شاسی اصلاح شده** (Audio Fix Applied)
- ✅ **تمام Components آماده** 
- ✅ **TypeScript Support**
- ✅ **Responsive Design**
- ✅ **Dark Mode Ready**
- ✅ **RTL Support (فارسی)**

---

## 🎉 شروع کردن

```bash
# 1. نصب وابستگی‌ها
npm install

# 2. اجرای توسعه
npm run dev

# 3. باز کردن مرورگر
# http://localhost:5173

# 4. ورود
# شناسه: admin
# رمز: admin

# 🎊 تمام!
```

---

**آخرین بروزرسانی:** 9 June 2026
**نسخه:** 1.0.0 (Fixed Audio Version)
