# -*- coding: utf-8 -*-
"""Zdania przykładowe do słówek (A1) — wzorzec: proste, z gramatyką z Podstaw (to be, present simple).
Uruchom: python tools/przyklady_a1.py — dopisuje pola example / example_pl do plików słownictwa."""
EX = {
 # ---- rodzina i ludzie
 "mother": ("My mother is a nurse.", "Moja mama jest pielęgniarką."),
 "father": ("My father works in a warehouse.", "Mój tata pracuje w magazynie."),
 "parents": ("My parents are at home.", "Moi rodzice są w domu."),
 "son": ("Their son is ten years old.", "Ich syn ma dziesięć lat."),
 "daughter": ("Our daughter likes music.", "Nasza córka lubi muzykę."),
 "brother": ("My brother is a driver.", "Mój brat jest kierowcą."),
 "sister": ("Her sister lives in London.", "Jej siostra mieszka w Londynie."),
 "grandmother": ("My grandmother is 80.", "Moja babcia ma 80 lat."),
 "grandfather": ("My grandfather has a big garden.", "Mój dziadek ma duży ogród."),
 "uncle": ("My uncle is a teacher.", "Mój wujek jest nauczycielem."),
 "aunt": ("My aunt lives near us.", "Moja ciocia mieszka blisko nas."),
 "cousin": ("My cousin is my best friend.", "Mój kuzyn jest moim najlepszym przyjacielem."),
 "husband": ("Her husband is a good cook.", "Jej mąż dobrze gotuje."),
 "wife": ("My wife works at night.", "Moja żona pracuje w nocy."),
 "baby": ("The baby is asleep.", "Niemowlę śpi."),
 "boy": ("The boy is my nephew.", "Ten chłopiec to mój bratanek."),
 "girl": ("The girl has a red bike.", "Dziewczynka ma czerwony rower."),
 "neighbour": ("Our neighbour is very friendly.", "Nasz sąsiad jest bardzo miły."),
 "guest": ("We have a guest tonight.", "Mamy dziś wieczorem gościa."),
 "stranger": ("Don't talk to strangers.", "Nie rozmawiaj z nieznajomymi."),
 "adult": ("Tickets for adults cost ten pounds.", "Bilety dla dorosłych kosztują dziesięć funtów."),
 "teenager": ("My son is a teenager now.", "Mój syn jest już nastolatkiem."),
 "people": ("There are many people here.", "Jest tu dużo ludzi."),
 "person": ("She is a kind person.", "Ona jest miłą osobą."),
 "nephew": ("My nephew is five.", "Mój bratanek ma pięć lat."),
 "niece": ("My niece loves animals.", "Moja siostrzenica kocha zwierzęta."),
 "grandson": ("Her grandson is a student.", "Jej wnuk jest studentem."),
 "granddaughter": ("Their granddaughter is two.", "Ich wnuczka ma dwa lata."),
 "mother-in-law": ("My mother-in-law is visiting us.", "Moja teściowa nas odwiedza."),
 "father-in-law": ("My father-in-law is a farmer.", "Mój teść jest rolnikiem."),
 "partner": ("This is my partner, Anna.", "To moja partnerka, Anna."),
 "girlfriend": ("His girlfriend is from Spain.", "Jego dziewczyna jest z Hiszpanii."),
 "boyfriend": ("Her boyfriend plays football.", "Jej chłopak gra w piłkę nożną."),
 "relative": ("We have relatives in Germany.", "Mamy krewnych w Niemczech."),
 "twins": ("They are twins.", "Oni są bliźniakami."),
 "only child": ("I am an only child.", "Jestem jedynakiem."),
 "widow": ("She is a widow.", "Ona jest wdową."),
 "engaged": ("We are engaged!", "Jesteśmy zaręczeni!"),
 "married": ("Are you married?", "Jesteś żonaty / zamężna?"),
 "divorced": ("My parents are divorced.", "Moi rodzice są rozwiedzeni."),
 "single": ("He is single.", "On jest kawalerem."),
 "birthday": ("My birthday is in May.", "Moje urodziny są w maju."),
 "wedding": ("The wedding is on Saturday.", "Ślub jest w sobotę."),
 "funeral": ("The funeral is tomorrow.", "Pogrzeb jest jutro."),
 "childhood": ("I had a happy childhood.", "Miałem szczęśliwe dzieciństwo."),
 "generation": ("My generation likes phones.", "Moje pokolenie lubi telefony."),
 "elderly": ("Elderly people need help.", "Osoby starsze potrzebują pomocy."),
 "landlady": ("My landlady lives downstairs.", "Właścicielka mieszkania mieszka na dole."),
 "classmate": ("Tom is my classmate.", "Tom jest moim kolegą z klasy."),
 "teammate": ("My teammates are great.", "Moi koledzy z zespołu są świetni."),
 "crowd": ("There is a big crowd outside.", "Na zewnątrz jest wielki tłum."),
 "group": ("We work in a group of five.", "Pracujemy w pięcioosobowej grupie."),
 # ---- kolory
 "red": ("The bus is red.", "Autobus jest czerwony."),
 "blue": ("My car is blue.", "Mój samochód jest niebieski."),
 "green": ("The grass is green.", "Trawa jest zielona."),
 "yellow": ("Bananas are yellow.", "Banany są żółte."),
 "black": ("I have a black jacket.", "Mam czarną kurtkę."),
 "white": ("The walls are white.", "Ściany są białe."),
 "grey": ("The sky is grey today.", "Niebo jest dziś szare."),
 "brown": ("Her eyes are brown.", "Jej oczy są brązowe."),
 "pink": ("The baby's room is pink.", "Pokój dziecka jest różowy."),
 "purple": ("She likes purple flowers.", "Ona lubi fioletowe kwiaty."),
 "orange (colour)": ("The safety vest is orange.", "Kamizelka odblaskowa jest pomarańczowa."),
 "gold": ("Her ring is gold.", "Jej pierścionek jest złoty."),
 "silver": ("The car is silver.", "Samochód jest srebrny."),
 "dark": ("It is dark outside.", "Na zewnątrz jest ciemno."),
 "light (colour)": ("I want a light blue shirt.", "Chcę jasnoniebieską koszulę."),
 "navy blue": ("The uniform is navy blue.", "Mundur jest granatowy."),
 "sky blue": ("The room is sky blue.", "Pokój jest błękitny."),
 "turquoise": ("The sea is turquoise here.", "Morze jest tu turkusowe."),
 "beige": ("The sofa is beige.", "Kanapa jest beżowa."),
 "cream (colour)": ("The kitchen is cream.", "Kuchnia jest kremowa."),
 "violet": ("Violet is my favourite colour.", "Fioletowy to mój ulubiony kolor."),
 "lime": ("The T-shirt is lime.", "Koszulka jest limonkowa."),
 "olive": ("He has an olive jacket.", "On ma oliwkową kurtkę."),
 "bright": ("The light is very bright.", "Światło jest bardzo jasne."),
 "pale": ("You look pale. Are you ill?", "Wyglądasz blado. Jesteś chory?"),
 "colourful": ("The market is colourful.", "Targ jest kolorowy."),
 "plain": ("I want a plain white T-shirt.", "Chcę zwykłą białą koszulkę."),
 "striped": ("He wears a striped shirt.", "On nosi koszulę w paski."),
 "spotted": ("Her dress is spotted.", "Jej sukienka jest w kropki."),
 "checked": ("I like checked shirts.", "Lubię koszule w kratę."),
 "shiny": ("The floor is shiny.", "Podłoga jest błyszcząca."),
 "matt": ("The paint is matt.", "Farba jest matowa."),
}

if __name__ == "__main__":
    import json, os, glob
    base = os.path.join(os.path.dirname(__file__), "..", "data", "slownictwo")
    n = 0
    for f in glob.glob(os.path.join(base, "*.json")):
        d = json.load(open(f, encoding="utf-8"))
        ch = False
        for it in d.get("items", []):
            if it.get("en") in EX and "pl" in it:
                it["example"], it["example_pl"] = EX[it["en"]]
                ch = True; n += 1
        if ch:
            json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("przykłady dopisane:", n)
