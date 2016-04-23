/**
 * Created by wangwy on 15-8-19.
 */
[].forEach.call($$("*"),function(a){
    a.style.outline="1px solid #"+(~~(Math.random()*(1<<24))).toString(16)
})
