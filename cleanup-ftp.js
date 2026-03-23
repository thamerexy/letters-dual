import ftp from 'basic-ftp';

async function cleanup() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        console.log("Connecting to FTP...");
        await client.access({
            host: process.env.FTP_SERVER,
            user: process.env.FTP_USERNAME,
            password: process.env.FTP_PASSWORD,
            secure: false // Use true for explicit FTPS if needed, but port 21 is usually standard FTP
        });

        console.log("Removing 'themerex' folder recursively...");
        // We go up one level first because the FTP user might be rooted in /themerex
        // or we just try to delete it relative to the login dir.
        try {
            await client.removeDir("themerex");
            console.log("Successfully deleted 'themerex' folder.");
        } catch (err) {
            console.log("Could not delete 'themerex' directly, trying to enter it first...");
            await client.cd("themerex");
            await client.clearWorkingDir();
            await client.cd("..");
            await client.removeDir("themerex");
            console.log("Successfully deleted 'themerex' folder after clearing.");
        }

    } catch (err) {
        console.error("Cleanup failed:", err);
    } finally {
        client.close();
    }
}

cleanup();
