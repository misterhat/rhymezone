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
    path: __dirname + '/word-descriptions.csv',
    header: [
        { id: 'word', title: 'Word' },
        { id: 'describes', title: '_____ word (describes)' },
        { id: 'described', title: 'word _____ (described as)' }
    ]
});

async function getWords(word) {
    const res = await fetch(DESCRIPTIVE_URL.replace('%s', word), {
        headers: { 'user-agent': USER_AGENT }
    });

    const describes = [];
    const described = [];

    const body = await res.text();
    const $ = cheerio.load(body);
    const blockquotes = $('blockquote').toArray();

    if (!blockquotes.length) {
        return { describes, described };
    }

    describes.push(
        ...$(blockquotes[0])
            .find('a.r')
            .toArray()
            .map((a) => $(a).text())
    );

    if (blockquotes[1]) {
        described.push(
            ...$(blockquotes[1])
                .find('a.r')
                .toArray()
                .map((a) => $(a).text())
        );
    }

    return { describes, described };
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
        let { describes, described } = await getWords(word);

        if (describes.length) {
            describes = describes
                .map((describesWord) => `${word} ${describesWord}`)
                .join(', ');
        } else {
            describes = '<empty>';
        }

        if (described.length) {
            described = described
                .map((describedWord) => `${describedWord} ${word}`)
                .join(', ');
        } else {
            described = '<empty>';
        }

        records.push({ word, describes, described });
        await new Promise((resolve) => setTimeout(resolve, TIMEOUT));
    }

    await csvWriter.writeRecords(records);

    console.log('done');
})();
