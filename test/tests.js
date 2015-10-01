var test = require('ava'),
    graph = require('../lib/graph');

test('parse single-node graph', function(t) {
  var g = graph.parse(
    {
      "@context": "http://example.org/ontology/",
      "@id": "http://example.org/person/1",
      "name": "Jane Doe",
      "jobTitle": "Professor"
    }
  );

  var p = g.byId("http://example.org/person/1");
  t.is(p.id, "http://example.org/person/1");
  t.is(p.get("name").value, "Jane Doe");
  t.is(p.get("jobTitle").value, "Professor");

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
      "numPages": {"@value": "153", "@type": "xsd:integer"},
      "read": {"@value": "no","@type": "http://example.org/hasRead"}
    }
  );

  var book = g.byId("http://example.org/book/1");
  t.is(book.get("title").type, "http://www.w3.org/2000/01/rdf-schema#langString");
  t.is(book.get("numPages").type, "http://www.w3.org/2001/XMLSchema#integer");
  t.is(book.get("read").type, "http://example.org/hasRead");

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
