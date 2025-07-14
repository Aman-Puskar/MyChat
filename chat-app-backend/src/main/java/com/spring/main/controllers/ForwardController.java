package com.spring.main.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ForwardController {

    @RequestMapping(value = "/{path:^(?!api).*$}")
    public String forwardReactRoutes() {
        return "forward:/index.html";
    }
}
