# LD-graph

LD-graph is a small library intended to make JSON-LD less painfull to work with.

## Status

Work in progress. Unstable. API not finalized

## Usage

Example input used throughout the documentation:

```javscript
var JSONLD = {
  "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "ex": "http://example.org/vocab#",
        "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@graph": [
    {
      "@id": "http://example.org/work/1",
      "@type": "ex:Work",
      "dc:title": {"@value": "Cat's cradle", "@language": "en"},
      "ex:creator: "http://example.org/person/1"
      "ex:themes": ["free will", "science", "nucelar war"]
    },
    {
      "@id": "http://example.org/person/1",
      "ex:name": "Kurt Vonnegut",
      "ex:born": {
        "@value": "1922",
        "@type": "xsd:gYear"
      },
      "ex:dead": {
        "@value": "2007",
        "@type": "xsd:gYear"
      }
    },
    {
      "@id": "http://example.org/publication/1",
      "@type": "ex:Publication",
      "ex:publicationOf: "http://example.org/work/1"
      "ex:date": "1963"
      "ex:hasExemplars": [
        {"@id": "http://example.org/item/1"},
        {"@id": "http://example.org/item/2"},
      ]
    },
    {
      "@id": "http://example.org/item/1",
      "@type": "ex:Item",
      "ex:exemplarOf: "http://example.org/publication/1"
      "ex:status": "available"
    },
    {
      "@id": "http://example.org/item/2",
      "@type": "ex:Item",
      "ex:exemplarOf: "http://example.org/publication/1"
      "ex:status": "on-loan"
    }
  ]
}
```

Import the library:

```javscript
var graph = require("ld-graph");
```

Parse a RDF graph in JSON-LD format into a graph object:

```javscript
var g = graph.parse(JSONLD);
```

You can now acces a node by Id(URI):

```javscript
var w = g.byId("http://example.org/work/1"),
    p = g.byId("http://example.org/publication/1"),
    i1 = g.byId("http://example.org/item/1"),
    i2 = g.byId("http://example.org/item/2");

w.id
\\ => "http://example.org/work/1"
```

You can also ask for nodes by type, which returns an array of nodes.

```javascript
var items = g.byType("Item");
```

Given a node, you can ask for it's literal values by the `key` method, which returns a Literal object with it's value, datatype and language-tag (if present):

```javscript
w.key("title")
// => {value: "Cat's cradle", type: "http://www.w3.org/2000/01/rdf-schema#langString", "lang": "en"}
```

If the node doesn't have a property defined for the given key, an error is raised.

There is also a convenience method `keyVal`, which returns only the value as a string, or `undefined` if the property is not defined for the node:

```javscript
w.keyVal("title")
// =>  "Cat's cradle"

w.keyVal("color")
// => undefined
```

The `key` and `keyVal` methods only returns the first literal, even if there are more defined. To get them all, use `keyAll`, which returns an array of Literal objects (or an empty array, if the property is not defined for the node):

```javscript
w.keyAll("themes").map(function (l) { return l.value; })
\\ => ["free will", "science", "nucelar war"]

w.keyAll("xyz")
\\ => []
```

To navigate from one node to another - use the `in` method for incoming relations and the `out` method for outgoing relations.

```javascript
w.in("publicationOf").id
\\ => "http://example.org/publication/1"

p.out("hasExemplar").id
\\ => "http://example.org/item/1"

```

To get an array of all matching nodes, use `inAll` and `outAll`:
```
p.inAll("exemplarOf").map(function(n) { return n.id })
\\ => ["http://example.org/item/1", "http://example.org/item/2"]

p.outAll("hasExemplar").map(function(n) { return n.id })
\\ => ["http://example.org/item/1", "http://example.org/item/2"]
```

## Limitations

* JSON-LD is a very flexible format - allowing you to represent the same information in multiple ways. Not all of these representations are supported yet, but may eventually be so when I encounter them in my work. Currently unsupported keywords: `@container`, `@list`, `@reverse`, `@index`, `@vocab`, `@base`, `@set`, `:`.
* No support for blank nodes whatsoever.
