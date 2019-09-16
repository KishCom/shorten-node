/*
*  Tests for shorten-node
*
*    These test only the functionality of the API, not any functional frontend.
*/

const request = require('supertest');
const chai = require('chai');
const app = require('./app');

//TODO: Add more
var invalidURLs = [
    '!',
    '%',
    '@@@',
    '^',
    '&',
    '*',
    '(',
    ')',
    '=',
];
chai.should();
describe('basic tests', () => {
    it('respond with 200.', function(done){
        request(app)
            .get('/')
            .expect(200)
            .end(function(err, res){
                if (err){ console.error(err); }
                done();
            });
    });
    let knownShortLink = false;
    const originalURL = `https://www.example.com/${new Date().getTime()}/`;
    it('setLink responds with expected json structure', (done) => {
        request(app)
            .post('/rpc/setLink')
            .send({originalURL})
            .expect(200)
            .end(function(err, res){
                if (err){ console.error(err); }
                res.body.should.have.property('shortenError', false);
                res.body.should.have.property('alreadyShortened', false);
                res.body.should.have.property('originalURL', originalURL);
                res.body.should.have.property('shortenedURL');
                knownShortLink = res.body.shortenedURL;
                done();
            });
    });
    it('getLink responds with expected json structure', (done) => {
        request(app)
            .post('/rpc/getLink')
            .send({"shortenedURL": knownShortLink})
            .expect(200)
            .end(function(err, res){
                if (err){ console.error(err); }
                res.body.should.have.property('originalURL', originalURL);
                res.body.should.have.property('linkHash');
                res.body.should.have.property('timesUsed');
                done();
            });
    });
    it('setLink responds with error given specifed URL examples', (done) => {
        let totalDone = 0;
        function checkDone() { return (totalDone === invalidURLs.length) ? done() : false; }
        invalidURLs.forEach((invalidURL) => {
            request(app)
                .post('/rpc/setLink')
                .send({originalURL: invalidURL})
                .expect(400)
                .end(function(err, res){
                    if (err){ console.error(err); }
                    res.body.should.have.property('shortenError', 'Invalid or unsupported URI');
                    totalDone += 1;
                    checkDone();
                });
        });
    });
});
