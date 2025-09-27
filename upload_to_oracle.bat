@echo off
echo Uploading Rate My Rest to Oracle Cloud Server...
echo.

set KEY_PATH="C:\Users\agsse\Downloads\ssh-key-2025-09-26.key"
set SERVER=ubuntu@129.80.122.227

echo Step 1: Creating directories on server...
ssh -i %KEY_PATH% %SERVER% "mkdir -p ~/foodie/oracle-wallet"

echo Step 2: Uploading Oracle wallet files...
scp -i %KEY_PATH% -r oracle-wallet/* %SERVER%:~/foodie/oracle-wallet/

echo Step 3: Uploading project files...
scp -i %KEY_PATH% -r backend frontend docker-compose.prod.yml .env.production test_oracle_connection.py deploy_oracle.sh troubleshoot_oracle.sh %SERVER%:~/foodie/

echo Step 4: Setting permissions...
ssh -i %KEY_PATH% %SERVER% "cd ~/foodie && chmod +x *.sh"

echo.
echo ✅ Upload complete! Now SSH into your server and run:
echo ssh -i %KEY_PATH% %SERVER%
echo cd ~/foodie
echo python3 test_oracle_connection.py
echo bash deploy_oracle.sh
echo.
pause