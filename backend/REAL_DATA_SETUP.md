# 🍽️ Real Restaurant Data Setup Guide

This guide will help you populate your Rate My Rest database with real restaurant data from Google Places API.

## 🎯 Quick Start (One-Click Solution)

### Option 1: Run the Python Script
```bash
cd backend
python populate_real_data.py
```

### Option 2: Run the Batch File (Windows)
```bash
cd backend
populate_data.bat
```

## 🔑 Prerequisites

### 1. Get Google Places API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: Create a new project or select an existing one
3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Search for "Places API" and enable it
   - Also enable "Places API (New)" if available
4. **Create Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

### 2. Configure Your API Key

Edit `backend/.env` file and replace the placeholder:

```env
# Replace this line:
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# With your actual API key:
GOOGLE_PLACES_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🚀 What the Script Does

The `populate_real_data.py` script will:

### 📍 **Comprehensive Area Coverage**
- **Downtown Chapel Hill**: Radius 1.5km
- **Franklin Street**: Radius 1km
- **Carrboro**: Radius 1.5km
- **UNC Campus Area**: Radius 1.2km
- **South Chapel Hill**: Radius 1.5km
- **East Chapel Hill**: Radius 1.5km

### 🔍 **Multiple Search Strategies**
- Search by different keywords: "restaurant", "food", "dining", "cafe", "bar"
- Text search for specific restaurant names
- Place details enhancement for missing data

### 📊 **Smart Rate Limiting**
- Respects Google's free tier limits (1000 requests/day)
- 10 requests/second maximum
- Automatic delays between requests
- Real-time usage tracking

### 🏪 **Data Enhancement**
- **New Restaurant Discovery**: Finds restaurants not in database
- **Existing Restaurant Enhancement**: Adds missing Google data
- **Rich Data Collection**:
  - Names, addresses, phone numbers
  - Google ratings and review counts
  - Restaurant photos
  - Opening hours
  - Price levels
  - Cuisine types
  - Website URLs

## 📈 Expected Results

After running the script, you should have:

- **50-200+ restaurants** (depending on API usage)
- **Real Google Photos** for most restaurants
- **Accurate ratings** from Google Places
- **Complete address data**
- **Phone numbers and websites**
- **Opening hours** for most locations

## 💰 Cost Information

**Google Places API Pricing** (as of 2024):
- **Free Tier**: $200/month credit (plenty for this script)
- **Typical Usage**: $2-5 for complete Chapel Hill data
- **This Script**: Designed to stay within free limits

## 🛠️ Troubleshooting

### Issue: "No valid Google Places API key found"
**Solution**: Make sure you've updated the `.env` file with your real API key

### Issue: "The provided API key is invalid"
**Solutions**:
1. Check that you copied the API key correctly
2. Ensure Places API is enabled in Google Cloud Console
3. Check API key restrictions (should allow all APIs or specifically Places API)

### Issue: "Daily API limit reached"
**Solution**: Wait until the next day (limits reset at midnight Pacific Time) or increase your billing limits in Google Cloud Console

### Issue: Script stops with errors
**Solutions**:
1. Check your internet connection
2. Ensure Python dependencies are installed: `pip install -r requirements.txt`
3. Verify the backend database is accessible

## 📋 Sample Output

```
🚀 Rate My Rest - Real Data Population Script
==================================================
⏰ Started at: 2024-09-26 14:30:00

🔍 Starting comprehensive restaurant discovery...
📊 API requests used today: 0/1000

🔍 Searching Downtown Chapel Hill...
   🔸 Keyword: restaurant
      Found 15 restaurants
      ✅ Saved 12 new restaurants
   🔸 Keyword: food
      Found 8 restaurants
      📝 No new restaurants (all already in database)

📷 Enhancing existing restaurants with Google Places data...
   🔸 Enhancing: Lantern Restaurant
      ✅ Enhanced with Google Places data
   🔸 Enhancing: Crook's Corner
      ✅ Enhanced with Google Places data

📊 DATABASE POPULATION SUMMARY
==================================================
📍 Total Restaurants: 67
🔗 With Google Place ID: 58
📷 With Photos: 52
⭐ With Google Ratings: 61

🍽️  SAMPLE RESTAURANTS:
1. Lantern Restaurant
   📍 423 W Franklin St, Chapel Hill, NC 27516
   ⭐ 4.4★ | 📷 8 photos
   🍽️  Asian | 💰 $$$

🎉 POPULATION COMPLETE!
==============================
🔍 Total restaurants found: 89
💾 New restaurants saved: 23
✨ Existing restaurants enhanced: 15
📡 API requests used: 67
📊 API requests remaining today: 933

✅ Database is now populated with real restaurant data!
🌐 You can now test the application with live Google Places data.
```

## 🔄 Running Again

You can run the script multiple times:
- It won't duplicate restaurants
- It will enhance existing restaurants with missing data
- It will discover new restaurants in the area
- It tracks daily API usage to stay within limits

## 🌐 Testing Your Data

After population, test the application:

1. **Frontend**: http://localhost:3000
2. **Backend API**: http://localhost:8000/docs
3. **Check restaurants**: http://localhost:8000/restaurants/ (requires auth)
4. **Check recommendations**: http://localhost:8000/recommendations/ (requires auth)

Your application will now have real Chapel Hill restaurant data with photos, ratings, and complete information!