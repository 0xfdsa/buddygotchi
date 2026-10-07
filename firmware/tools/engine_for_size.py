# The AMOLED builds compile the gel engine's step for size (-Os) and the
# rest for speed (-O2): the engine runs once a step through about 117 KB of
# code, which -O2's inlining makes miss the ESP32-S3's 16 KB instruction
# cache on nearly every line; at -Os it's 45 KB and takes half the time.
# The pixel loops stay -O2. Only the board builds run this; the simulator's are unchanged.
Import("env")

ENGINE = ("acting.cpp", "engine.cpp", "face.cpp", "motion.cpp", "router.cpp", "scenes.cpp")


def for_size(env, node):
    if node.name not in ENGINE:
        return node
    # The last -O on the command line wins, after build_flags' -O2.
    return env.Object(node, CCFLAGS=env["CCFLAGS"] + ["-Os"])


env.AddBuildMiddleware(for_size, "*/render/gel/*.cpp")
