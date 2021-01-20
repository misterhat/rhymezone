const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const TIMEOUT = Number.parseInt(
    fs.readFileSync('./timeout.json').toString(),
    10
);

const USER_AGENT =
    'Mozilla/5.0 (X11; Linux x86_64; rv:84.0) Gecko/20100101 ' + 'Firefox/84.0';

const DESCRIPTIVE_URL =
    'https://www.rhymezone.com/r/rhyme.cgi?Word=%s&typeofrhyme=jjb&org1=syl' +
    '&org2=l&org3=y';

const csvWriter = createCsvWriter({
    path: __dirname + '/words.csv',
    header: [
        { id: 'word', title: 'Word' },
        { id: 'descriptiveWords', title: 'Descriptive Words' }
    ]
});

async function getDescriptiveWords(word) {
    const res = await fetch(DESCRIPTIVE_URL.replace('%s', word), {
        headers: { 'user-agent': USER_AGENT }
    });

    const body = await res.text();
    const $ = cheerio.load(body);

    const descriptiveWords = $('a.r')
        .toArray()
        .map((a) => {
            return $(a).text();
        });

    console.log(descriptiveWords);

    return descriptiveWords;
}

(async () => {
    const words = fs
        .readFileSync(__dirname + '/words.txt')
        .toString()
        .replace(/\r\n/g, '\n')
        .trim()
        .split('\n')
        .map((word) => {
            return word.trim().toLowerCase();
        });

    const records = [];

    for (const word of words) {
        console.log(`saving "${word}"...`);
        const descriptiveWords = (await getDescriptiveWords(word)).join(', ');
        records.push({ word, descriptiveWords });
        await new Promise((resolve) => setTimeout(resolve, TIMEOUT));
    }

    await csvWriter.writeRecords(records);

    console.log('done');
})();
