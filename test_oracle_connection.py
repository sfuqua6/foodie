#!/usr/bin/env python3
"""
Oracle Database Connection Test Script
This script tests the connection to Oracle Autonomous Database
"""

import os
import sys
import cx_Oracle
from sqlalchemy import create_engine

def test_cx_oracle_direct():
    """Test direct cx_Oracle connection."""
    print("🔍 Testing direct cx_Oracle connection...")

    # Set environment variables
    os.environ['TNS_ADMIN'] = './oracle-wallet'

    try:
        # Create DSN for Oracle Autonomous Database
        dsn = cx_Oracle.makedsn(
            host=None,
            port=None,
            service_name="foodiedb_medium"
        )

        print(f"📡 Connecting to service: foodiedb_medium")
        print(f"📁 Wallet location: {os.environ.get('TNS_ADMIN')}")

        # Test connection
        connection = cx_Oracle.connect(
            user="ADMIN",
            password="Reesespower69!",
            dsn=dsn
        )

        print("✅ Direct cx_Oracle connection successful!")

        # Test a simple query
        cursor = connection.cursor()
        cursor.execute("SELECT 'Hello from Oracle Autonomous Database!' as message FROM dual")
        result = cursor.fetchone()
        print(f"✅ Query result: {result[0]}")

        # Get database version
        cursor.execute("SELECT banner FROM v$version WHERE ROWNUM = 1")
        version = cursor.fetchone()
        print(f"📊 Database version: {version[0]}")

        cursor.close()
        connection.close()
        return True

    except Exception as e:
        print(f"❌ Direct cx_Oracle connection failed: {e}")
        print(f"🔧 Check your wallet files in: {os.environ.get('TNS_ADMIN')}")
        return False


def test_sqlalchemy_connection():
    """Test SQLAlchemy Oracle connection."""
    print("\n🔍 Testing SQLAlchemy Oracle connection...")

    database_url = "oracle+cx_oracle://ADMIN:Reesespower69!@foodiedb_medium"

    try:
        # Set Oracle environment
        os.environ['TNS_ADMIN'] = './oracle-wallet'

        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
            echo=False
        )

        print(f"📡 SQLAlchemy engine created for: {database_url}")

        # Test connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 'SQLAlchemy connection works!' as message FROM dual")
            row = result.fetchone()
            print(f"✅ SQLAlchemy connection successful!")
            print(f"✅ Query result: {row[0]}")

        return True

    except Exception as e:
        print(f"❌ SQLAlchemy connection failed: {e}")
        return False


def check_wallet_files():
    """Check if Oracle wallet files exist."""
    print("\n🔍 Checking Oracle wallet files...")

    wallet_dir = './oracle-wallet'
    required_files = [
        'cwallet.sso',
        'ewallet.p12',
        'keystore.jks',
        'ojdbc.properties',
        'sqlnet.ora',
        'tnsnames.ora',
        'truststore.jks'
    ]

    if not os.path.exists(wallet_dir):
        print(f"❌ Wallet directory not found: {wallet_dir}")
        print("📋 Please download and extract your Oracle wallet to ./oracle-wallet/")
        return False

    missing_files = []
    for file in required_files:
        file_path = os.path.join(wallet_dir, file)
        if os.path.exists(file_path):
            print(f"✅ Found: {file}")
        else:
            print(f"❌ Missing: {file}")
            missing_files.append(file)

    if missing_files:
        print(f"\n❌ Missing wallet files: {', '.join(missing_files)}")
        return False

    print("✅ All wallet files present!")
    return True


def check_environment():
    """Check environment configuration."""
    print("\n🔍 Checking environment configuration...")

    # Check Oracle client installation
    try:
        import cx_Oracle
        print(f"✅ cx_Oracle version: {cx_Oracle.version}")
    except ImportError:
        print("❌ cx_Oracle not installed. Run: pip install cx_Oracle")
        return False

    # Check TNS_ADMIN
    tns_admin = os.environ.get('TNS_ADMIN')
    print(f"📁 TNS_ADMIN: {tns_admin}")

    # Check LD_LIBRARY_PATH (important for Linux)
    ld_path = os.environ.get('LD_LIBRARY_PATH')
    if ld_path:
        print(f"📚 LD_LIBRARY_PATH: {ld_path}")
    else:
        print("⚠️  LD_LIBRARY_PATH not set (may be needed on Linux)")

    return True


def main():
    """Main test function."""
    print("🚀 Oracle Autonomous Database Connection Test")
    print("=" * 50)

    # Check environment
    if not check_environment():
        print("\n❌ Environment check failed!")
        return False

    # Check wallet files
    if not check_wallet_files():
        print("\n❌ Wallet files check failed!")
        return False

    # Test direct connection
    direct_success = test_cx_oracle_direct()

    # Test SQLAlchemy connection
    sqlalchemy_success = test_sqlalchemy_connection()

    print("\n" + "=" * 50)
    print("📊 CONNECTION TEST SUMMARY")
    print("=" * 50)
    print(f"Direct cx_Oracle: {'✅ SUCCESS' if direct_success else '❌ FAILED'}")
    print(f"SQLAlchemy:       {'✅ SUCCESS' if sqlalchemy_success else '❌ FAILED'}")

    if direct_success and sqlalchemy_success:
        print("\n🎉 All connection tests passed!")
        print("🚀 Your Oracle Autonomous Database is ready for deployment!")
        return True
    else:
        print("\n💡 TROUBLESHOOTING TIPS:")
        print("1. Verify your Oracle wallet files are in ./oracle-wallet/")
        print("2. Check that your database service name is 'foodiedb_medium'")
        print("3. Verify your database credentials")
        print("4. Ensure Oracle Instant Client is installed")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)