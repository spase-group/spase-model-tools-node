function level(chapters, opts) {
    let res = ''
    
    for (const ch of chapters) {
        res += opts.fn(ch)
        
        if (ch.chapters) {
            res += Handlebars.helpers.level(ch.chapters, opts)
        }
    }
    
    return res
}