const ExcelJS = require('exceljs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');

const TIMEOUT = Number.parseInt(
    fs.readFileSync('./timeout.json').toString(),
    10
);

const USER_AGENT =
    'Mozilla/5.0 (X11; Linux x86_64; rv:84.0) Gecko/20100101 ' + 'Firefox/84.0';

const DESCRIPTIVE_URL =
    'https://www.rhymezone.com/r/rhyme.cgi?Word=%s&typeofrhyme=jjb&org1=syl' +
    '&org2=l&org3=y';

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Words');

sheet.columns = [
    { key: 'word', header: 'Word' },
    { key: 'describes', header: '_____ word (describes)', width: 100 },
    { key: 'described', header: 'word _____ (described as)', width: 100 }
];

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
        })
        .filter((word) => {
            return word && word.length;
        });

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

        sheet.addRow({ word, describes, described });
        await new Promise((resolve) => setTimeout(resolve, TIMEOUT));
    }

    sheet.getColumn('word').eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheet.getColumn('describes').eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true };
    });

    sheet.getColumn('described').eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true };
    });

    fs.writeFileSync('./output-words.xlsx', await workbook.xlsx.writeBuffer());

    console.log('done');
})();
