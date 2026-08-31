const process   = require('process');
const axios     = require('axios');
const fs        = require('fs');
const chalk     = require('chalk');

module.exports = {

  async onPreBuild({ inputs, utils }) {
    console.log(chalk.cyanBright("================================"));
    console.log(chalk.cyanBright("= Instagram images starting up ="));
    console.log(chalk.cyanBright("================================"));

    const timestamp = Date.now();
    const dataFolder = inputs.dataFolder;
    const dataFile = `${dataFolder}/instagram.json`;
    const imageFolder = inputs.imageFolder;
    const endpoint = 'https://graph.instagram.com';
    const userId = process.env.INSTAGRAM_USER_ID;
    const fields = 'caption,media_url,media_type,permalink';
    const numberImages = inputs.imageCount;
    console.log('Fetching',chalk.yellow(numberImages),'instagram images.');
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const instagramAPIUrl = `${endpoint}/${userId}/media/?fields=${fields}&limit=${numberImages}&access_token=${token}`;
    console.log('Instagram API url constructed:',  instagramAPIUrl);
    //console.log('Instagram data file location:', chalk.yellow(dataFile));
    //console.log('Instagram images folder location:', chalk.yellow(imageFolder));

    // Create the images directory if it doesn't exist
    //if ( await utils.cache.has(imageFolder) ) {
    //  await utils.cache.restore(imageFolder);
    //  console.log('Restored Instagram images folder from cache:', chalk.green(imageFolder));
    //} else {
      fs.mkdirSync(imageFolder, { recursive: true });
    //  await utils.cache.save(imageFolder, { ttl: inputs.imageTTL });
    //  console.log('Created Instagram images folder:', chalk.green(imageFolder));
    //}

    // Create the data file directory if it doesn't exist
    //if ( await utils.cache.has(dataFolder) ) {
    //  await utils.cache.restore(dataFolder);
    //  console.log('Restored Instagram datafile folder from cache:', chalk.green(dataFolder));
    //} else {
      fs.mkdirSync(dataFolder, { recursive: true });
    //  await utils.cache.save(dataFolder, { ttl: inputs.imageTTL });
    //  console.log('Created Instagram datafile folder:', chalk.green(dataFolder));
    //}

    let instagramResponse;
    let instagramData;

    // reinstate data file from cache if it is present
    //if ( await utils.cache.has(dataFile) ) {
    //  await utils.cache.restore(dataFile);
    //  instagramData = require(`${process.cwd()}/${dataFile}`);
    //  console.log('Instagram datafile restored from cache:', chalk.green(dataFile));
    //}
    // Or if it's not cached, let's fetch it and cache it.
    //else {
    //  console.log('Instagram datafile not present so calling Instagram API');

      try {
        const response = await axios.get(instagramAPIUrl);
        console.log('Instagram API success - Return status:', chalk.green(response.status));
        instagramResponse = response.data;
      } catch (err) {
        // axios exposes the HTTP status under err.response.status, not err.status.
        console.log('Instagram API failure - Return status:', chalk.red(err.response?.status));
        console.log(err);
      }

      // If we didn't receive data, fail the plugin but not the build
      if(!instagramResponse){
        utils.build.failBuild(`The Instagram feed did not return data.\nHalting the build.`);
        return;
      }

      // create the instagram JSON and write it out and cache it
      instagramData = [];
      let i=1;
      for (const image of instagramResponse.data) {
        // skip videos
        if (image.media_type === 'VIDEO') continue;
        let localImageFilename = `${timestamp}-${i}.jpg`;
        instagramData.push({
          "id": image.id,
          "caption": image.caption,
          "media_type": image.media_type,
          "instagramURL": image.permalink,
          "sourceImageURL": image.media_url,
          "localImageFilename": localImageFilename
        });
        i++
      }
      fs.writeFileSync(dataFile, JSON.stringify(instagramData));
      console.log("Instagram data fetched and written to json data file ",chalk.green(dataFile));
    //  await utils.cache.save(dataFile, { ttl: inputs.feedTTL });
    //  console.log(chalk.green("Instagram data fetched and cached in json data file"), chalk.gray(`(TTL:${inputs.feedTTL} seconds)`));
    //}

    // Now we have a well-formated data object describing the instagram feed,
    // let's fetch any uncached images we might need
    console.log("Iterating over",chalk.yellow(instagramData.length),"Instagram images.");
    let j = 1;
    for (const { localImageFilename, sourceImageURL } of instagramData) {
      const localImageURL = `${imageFolder}/${localImageFilename}`;
      try {
        const response = await axios({
          url: sourceImageURL,
          method: 'GET',
          responseType: 'stream'
        });
        console.log("Processing image #", j);
        // Wait for the download stream to finish writing before moving on,
        // otherwise the build can complete before the images are flushed to disk.
        await new Promise((resolve, reject) => {
          const dest = fs.createWriteStream(localImageURL);
          response.data.pipe(dest);
          dest.on('finish', resolve);
          dest.on('error', reject);
          response.data.on('error', reject);
        });
        console.log("Image written to:", chalk.green(localImageURL));
      } catch (err) {
        console.log(`Instagram image #${j} retrieval failure - return status:`, chalk.red(err.response?.status));
        console.log(err);
      }
      j++;
    }
  console.log(chalk.cyanBright("============================="));
  console.log(chalk.cyanBright("= Instagram images finished ="));
  console.log(chalk.cyanBright("============================="));
  }
}