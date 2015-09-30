# LD-graph


## Status
Work in progress

## API

Rough sketch:

```
input: json-ld
output: graph

------
API:
------

graph object g
============
g.byId("http://example.org/resource/p234") => resource
g.byType("Publication") => [..] resource
g.all() => [..] resource

resource object r
===============
r.id => <uri>
r.get("title") => literal
r.getAll("title") =>[..] literal
r.get("publicationOf") => resource
r.getAll("relatedWorks") => [...] resource

literal l
======
l.type => "http:/rdf/langString"
l.value => "hei"
l.lang => "no"
```



## Limitations
* It will not parse graphs containing blank nodes.