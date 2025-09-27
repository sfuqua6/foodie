# 🚀 One-Click Real Restaurant Data Setup

## 📋 Quick Summary

I've created a **one-click solution** to populate your Rate My Rest database with real restaurant data from Google Places API.

## 🎯 What You Get

After running the script, your database will contain:
- **Real Chapel Hill restaurants** with accurate data
- **Google Photos** for most restaurants
- **Accurate ratings** from Google Places
- **Complete contact information** (phone, website, address)
- **Opening hours** and **price levels**
- **50-200+ restaurants** (depending on API usage)

## 🔑 Prerequisites (One-Time Setup)

### 1. Get Google Places API Key (Free!)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project or select existing one
3. Enable "Places API"
4. Create credentials → API Key
5. Copy the API key

### 2. Configure API Key
Edit `backend/.env` file:
```env
# Replace this line:
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# With your actual API key:
GOOGLE_PLACES_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🚀 One-Click Execution

### Option 1: Windows Batch File (Easiest)
```bash
cd backend
populate_data.bat
```

### Option 2: Python Script
```bash
cd backend
python populate_real_data_simple.py
```

### Option 3: Advanced Script (More Features)
```bash
cd backend
python populate_real_data.py
```

## 📊 Expected Output

```
Rate My Rest - Real Data Population Script
==================================================
Started at: 2025-09-26 14:30:00

API Usage Status:
Daily requests used: 0/1000
Remaining API requests today: 1000

==================================================
RUNNING COMPREHENSIVE DATA SYNC
==================================================

Step 1: Updating existing restaurants with missing data...
Updated 15 restaurants
Errors: 0
API requests remaining: 950

Step 2: Discovering new restaurants...
Added 23 new restaurants
API requests remaining: 890

==================================================
DATABASE SUMMARY
==================================================
Total Restaurants: 67
With Google Place ID: 58
With Photos: 52

Top Rated Restaurants:
1. Lantern Restaurant - 4.8/5
   Address: 423 W Franklin St, Chapel Hill, NC 27516

2. Panzanella - 4.6/5
   Address: 110 N Main St, Carrboro, NC 27510

SUCCESS: Database is now populated with real restaurant data!

Access your application at:
Frontend: http://localhost:3000
Backend API: http://localhost:8000/docs
```

## 💰 Cost Information

- **Google Places API**: $200/month free credit
- **This script usage**: Typically $2-5 for complete Chapel Hill data
- **Designed to stay within free limits**

## 🛠️ Troubleshooting

### "No valid Google Places API key found"
- Make sure you updated the `.env` file correctly
- Ensure you copied the API key without extra spaces

### "The provided API key is invalid"
- Check that Places API is enabled in Google Cloud Console
- Verify API key has no restrictions or allows Places API

### Script stops with errors
- Check internet connection
- Ensure backend is not running (stop with Ctrl+C first)
- Try running: `pip install -r requirements.txt`

## 🔄 Running Multiple Times

You can run the script multiple times safely:
- ✅ Won't create duplicate restaurants
- ✅ Will enhance existing restaurants with missing data
- ✅ Will discover new restaurants
- ✅ Tracks daily API usage

## 🌐 Test Your Real Data

After successful population:

1. **Visit Frontend**: http://localhost:3000
2. **Register/Login**: Create an account
3. **Browse Restaurants**: See real Chapel Hill restaurants with photos
4. **Test Recommendations**: Get ML-powered suggestions
5. **Rate Restaurants**: Add your own ratings

## 📁 Files Created

- `backend/populate_real_data_simple.py` - Main one-click script
- `backend/populate_real_data.py` - Advanced version with more features
- `backend/populate_data.bat` - Windows batch file
- `backend/REAL_DATA_SETUP.md` - Detailed documentation

## ✅ Success Indicators

You'll know it worked when:
- ✅ Script completes without errors
- ✅ Database summary shows 50+ restaurants
- ✅ Frontend shows real restaurant photos
- ✅ Restaurant names match real Chapel Hill places
- ✅ Addresses and contact info are accurate

**Your Rate My Rest application is now ready for real-world testing with authentic Chapel Hill restaurant data!** 🎉