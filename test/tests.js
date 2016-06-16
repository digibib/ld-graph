var test = require('ava'),
    graph = require('../lib/graph');

test('parse single-node graph', function(t) {
  var g = graph.parse(
    {
      "@id": "http://example.org/person/1",
      "http://example.org/ontology#name": "Jane Doe",
      "http://example.org/ontology#jobTitle": "Professor",
      "wearsGlasses": true
    }
  );

  var p = g.byId("http://example.org/person/1");
  t.is(p.id, "http://example.org/person/1");
  t.is(p.get("name").value, "Jane Doe");
  t.is(p.get("jobTitle").value, "Professor");
  t.is(p.get("wearsGlasses").value, true);
  t.is(p.get("wearsGlasses").type, "boolean");

  t.end();
});

test('parse language-tagged literals', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/ontology/",
      "@id": "http://example.org/book/1",
      "title": {"@value": "Granbar", "@language": "nb-no"}
    }
  );

  var book = g.byId("http://example.org/book/1");
  t.is(book.get("title").value, "Granbar");
  t.is(book.get("title").lang, "nb-no");

  t.end();
});

test('parse typed literals', function(t) {
  var g = graph.parse(
    {
      "@context": {
        "@vocab": "http://example.org/ontology/",
        "xsd": "http://www.w3.org/2001/XMLSchema#"
      },
      "@id": "http://example.org/book/1",
      "title": {"@value": "Granbar", "@language": "nb-no"},
      "subtitle": "en roman",
      "numPages": {"@value": "153", "@type": "xsd:integer"},
      "numPagesImplicitType": 153,
      "read": {"@value": "no","@type": "http://example.org/hasRead"}
    }
  );

  var book = g.byId("http://example.org/book/1");
  t.is(book.get("title").type, "langString");
  t.is(book.get("subtitle").type, "string");
  t.is(book.get("numPages").type, "integer");
  t.is(book.get("numPagesImplicitType").type, "integer");
  t.is(book.get("read").type, "hasRead");

  t.end();
});


test('graph.byId fails when resource does not exist', function(t) {

  var g = graph.parse(
    {
      "@context": "http://example.org/ontology/",
      "@id": "http://example.org/person/1",
      "name": "Jane Doe",
    }
  );

  t.throws(function() {
    g.byId("http://example.org/person/2");
  }, /resource not in graph/);

  t.end();
});

test('node.get fails when property is not defined for node', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/ontology/",
      "@id": "http://example.org/person/1",
      "name": "Jane Doe",
    }
  );

  var p = g.byId("http://example.org/person/1");
  t.throws(function() {
    p.get("age");
  }, /property not defined for resource/);


  t.end();
});

test('parse multi-node graph', function(t) {
  var g = graph.parse(
    {
      "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "ex": "http://example.org/vocab#",
      },
      "@graph": [
        {
          "@id": "http://example.org/book/1",
          "dc:creator": "Kurt Vonnegut",
          "dc:title": "Cat's cradle"
        },
        {
          "@id": "http://example.org/book/2",
          "dc:creator": "Milan Kundera",
          "dc:title": {"@value": "Langsomheten", "@language": "no"}
        },
        {
          "@id": "http://example.org/book/3",
          "dc:creator": "Plato",
          "dc:title": "The Republic"
        }
      ]
    }
  );

  t.doesNotThrow(function() {
    g.byId("http://example.org/book/1");
    g.byId("http://example.org/book/2");
    g.byId("http://example.org/book/3");
  });

  var all = g.all();
  t.same(all.map(function(node) { return node.get("title").value }),
         ["Cat's cradle", "Langsomheten", "The Republic"]);

  t.end();
});

test('parse multiple values of property', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/ontology/",
      "@id": "http://example.org/book/1",
      "title": "Rundt solen i ring",
      "creator": ["Tor Åge Bringsværd", {"@value": "Jon Bing", "@type": "creator"}]
    }
  );

  var b = g.byId("http://example.org/book/1");
  t.is(b.get("creator").value, "Tor Åge Bringsværd");
  t.same(b.getAll("creator").map(function(c) { return c.value; }),
         ["Tor Åge Bringsværd", "Jon Bing"]);
  t.same(b.getAll("elevator"), []);
  t.is(b.getCount("title"), 1);
  t.is(b.getCount("creator"), 2);
  t.is(b.getCount("elevator"), 0);

  t.end();
});

test('links between nodes in graph', function(t) {
  var g = graph.parse(
    {
      "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "ex": "http://example.org/vocab#",
      },
      "@graph": [
        {
          "@id": "http://example.org/work/1",
          "dc:creator": "Kurt Vonnegut",
          "dc:title": "Cat's cradle"
        },
        {
          "@id": "http://example.org/publication/1",
          "publicationOf": {"@id": "http://example.org/work/1"},
          "publicationDate": "1963"
        },
        {
          "@id": "http://example.org/item/1",
          "exemplarOf": {"@id": "http://example.org/publication/1"},
          "status": "on-loan"
        },
        {
          "@id": "http://example.org/item/2",
          "exemplarOf": {"@id": "http://example.org/publication/1"},
          "status": "available"
        }
      ]
    }
  );


  t.same(g.byId("http://example.org/work/1"),
         g.byId("http://example.org/publication/1").out("publicationOf"));
  t.same(g.byId("http://example.org/work/1").in("publicationOf"),
         g.byId("http://example.org/publication/1"));
  t.same(g.byId("http://example.org/item/1").out("exemplarOf"),
         g.byId("http://example.org/item/2").out("exemplarOf"));
  t.is(g.byId("http://example.org/item/1").out("exemplarOf").out("publicationOf").get("title").value,
       "Cat's cradle");

  t.end();
});

test('multiple links', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/vocab#",
      "@graph": [
        {
          "@id": "http://example.org/person/1",
          "name": "Joe",
          "hates": [{"@id": "http://example.org/food/1"}, {"@id": "http://example.org/food/2"}]
        },
        {
          "@id": "http://example.org/food/1",
          "name": "Broccoli",
        },
        {
          "@id": "http://example.org/food/2",
          "name": "Grapefruit",
        }
      ]
    }
  );

  t.same(g.byId("http://example.org/person/1").outAll("hates").map(function(n) { return n.get("name").value; }),
         ["Broccoli", "Grapefruit"]);

  t.end()
});

test('nodes available as subject, even if only object in graph', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/ontology/",
      "@id": "http://example.org/book/1",
      "creator": {"@id": "http://example.org/creator/1"}
    }
  );

  t.same(g.byId("http://example.org/book/1"),
         g.byId("http://example.org/creator/1").in("creator"));

  t.end();
});


test('handles circular relations', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/vocab#",
      "@graph": [
        {
          "@id": "http://example.org/person/1",
          "name": "Joe",
          "loves": {"@id": "http://example.org/person/2"}
        },
        {
          "@id": "http://example.org/person/2",
          "name": "Jane",
          "loves": {"@id": "http://example.org/person/1"}
        }
      ]
    }
  );

  t.same(g.byId("http://example.org/person/1").out("loves").out("loves"),
         g.byId("http://example.org/person/1"));

  t.same(g.byId("http://example.org/person/2").in("loves").in("loves"),
         g.byId("http://example.org/person/2"));

  t.end();
});

test('filter resources by type', function(t) {
  var g = graph.parse(
    {
      "@context": {"vocab": "http://example.org/vocab#"},
      "@graph": [
        {
          "@id": "http://example.org/work/1",
          "@type": "vocab:Work",
          "vocab:title": "My life"
        },
        {
          "@id": "http://example.org/publication/1",
          "@type": "Publication",
          "vocab:publicationOf": {"@id": "http://example.org/work/1"},
          "vocab:hasExemplars": [
            {"@id": "http://example.org/item/1"},
            {"@id": "http://example.org/item/2"}
          ]
        },
        {
          "@id": "http://example.org/item/1",
          "@type": ["vocab:Item","vocab:Item2"]
        },
        {
          "@id": "http://example.org/item/2",
          "@type": "vocab:Item",
        }
      ]
    }
  );

  t.same(g.byType("Work")[0],
         g.byId("http://example.org/work/1"));
  t.same(g.byType("Item"),
         g.byId("http://example.org/publication/1").outAll("hasExemplars"));
  t.end();
});

test('can merge two graphs', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/vocab#",
      "@id": "http://example.org/person/1",
      "name": "Tarzan",
      "likes": {"@id": "http://example.org/person/2"}
    },
    {
      "@context": "http://example.org/vocab#",
      "@id": "http://example.org/person/2",
      "name": "Jane"
    }
  );

  t.same(g.byId("http://example.org/person/1").out("likes").get("name").value,
         "Jane");

  t.end();
});

test('test property/relation existence', function(t) {
  var g = graph.parse(
    {
      "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "ex": "http://example.org/vocab#",
      },
      "@graph": [
        {
          "@id": "http://example.org/work/1",
          "dc:creator": "Kurt Vonnegut",
          "dc:title": "Cat's cradle"
        },
        {
          "@id": "http://example.org/publication/1",
          "publicationOf": {"@id": "http://example.org/work/1"},
          "publicationDate": "1963"
        },
      ]
    }
  );

  var b = g.byId("http://example.org/work/1");
  t.is(b.has("title"), true);
  t.is(b.has("issueYear"), false);
  t.is(b.hasOut("hasPublication"), false);
  t.is(b.hasIn("publicationOf"), true);
  t.is(g.byId("http://example.org/publication/1").hasOut("publicationOf"), true);

  t.end();
});

/*
test('parses resource hierarchy', function(t) {
  var g = graph.parse(
    {
      "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "ex": "http://example.org/vocab#",
      },
      "@id": "http://example.org/work/1",
      "dc:creator": "Kurt Vonnegut",
      "dc:title": "Cat's cradle",
      "hasPublication": {
        "@id": "http://example.org/publication/1",
        "publicationOf": {"@id": "http://example.org/work/1"},
        "publicationDate": "1963",
        "hasExemplar": [
          {
            "@id": "http://example.org/item/1",
            "exemplarOf": {"@id": "http://example.org/publication/1"},
            "status": "on-loan"
          },
          {
            "@id": "http://example.org/item/2",
            "exemplarOf": {"@id": "http://example.org/publication/1"},
            "status": "available"
          }
        ]
      }
    }
  );

  t.same(g.byId("http://example.org/work/1"),
         g.byId("http://example.org/work/1").get("hasPublication").get("publicationOf"));

  t.end();
});
*/

test('test parse blank node with a number', function(t) {
  var g = graph.parse(
      {
        "@graph": [
          {
            "@id": "_:b0",
            "@type": [
              "deichman:SerialIssue",
              "deichman:OtherType"
            ],
            "deichman:issue": 23,
            "deichman:serial": {
              "@id": "http://192.168.50.12:8005/ser22332"
            }
          },
          {
            "@id": "http://192.168.50.12:8005/publication/p278128608396",
            "@type": "deichman:Publication",
            "deichman:inSerial": {
              "@id": "_:b0"
            },
            "deichman:publicationOf": {
              "@id": "http://192.168.50.12:8005/work/w411874932273"
            },
            "deichman:recordID": "231"
          }
        ],
        "@context": {
          "deichman": "http://192.168.50.12:8005/ontology#",
          "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
        }
      }
  );

  var blankNode = g.byType("SerialIssue")[0];
  t.is(blankNode.isA("SerialIssue"), true);
  t.is(blankNode.isA("OtherType"), true);
  t.is(blankNode.isA("UnknownType"), false);
  t.is(blankNode.get("issue").value, 23);
  t.is(blankNode.hasOut("serial"), true);
  t.same(blankNode.in("inSerial").id, "http://192.168.50.12:8005/publication/p278128608396");

  var publicationNode = g.byType("Publication")[0];
  t.is(publicationNode.out("inSerial").getAll("issue")[0].value, 23);
  t.end();
});
